package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

var (
	ErrBalanceNotFound   = errors.New("currency balance pocket not found")
	ErrInsufficientFunds = errors.New("insufficient funds on balance")
	ErrAccountNotFound   = errors.New("user account not found")
)

type ExchangeRateRepository struct {
	pool *pgxpool.Pool
}

func NewExchangeRateRepository(pool *pgxpool.Pool) *ExchangeRateRepository {
	return &ExchangeRateRepository{pool: pool}
}

func (r *ExchangeRateRepository) GetLatestRate(ctx context.Context, from, to string) (decimal.Decimal, error) {
	query := `
		SELECT rate
		FROM exchange_rates
		WHERE from_currency = $1 AND to_currency = $2
		ORDER BY created_at DESC
		LIMIT 1;
	`
	var rate decimal.Decimal
	err := r.pool.QueryRow(ctx, query, from, to).Scan(&rate)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return decimal.Zero, nil
		}
		return decimal.Zero, fmt.Errorf("failed to query exchange rate: %w", err)
	}
	return rate, nil
}

func (r *ExchangeRateRepository) SaveRates(ctx context.Context, rates map[string]decimal.Decimal, baseCurrency string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	query := `
		INSERT INTO exchange_rates (from_currency, to_currency, rate)
		VALUES ($1, $2, $3)
	`

	targetCurrencies := []string{"USD", "EUR", "RUB"}
	for _, cur := range targetCurrencies {
		rate, ok := rates[cur]
		if !ok || rate.LessThanOrEqual(decimal.Zero) {
			continue
		}

		if _, err := tx.Exec(ctx, query, cur, baseCurrency, rate); err != nil {
			return fmt.Errorf("failed to insert rate for %s: %w", cur, err)
		}
	}

	return tx.Commit(ctx)
}

func (r *ExchangeRateRepository) GetAccountIDByUserID(ctx context.Context, userID uuid.UUID) (uuid.UUID, error) {
	var accountID uuid.UUID
	query := `SELECT id FROM accounts WHERE user_id = $1 LIMIT 1;`
	err := r.pool.QueryRow(ctx, query, userID).Scan(&accountID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return uuid.Nil, ErrAccountNotFound
		}
		return uuid.Nil, fmt.Errorf("failed to get account by user id: %w", err)
	}
	return accountID, nil
}

type ExchangeResult struct {
	TransactionID   uuid.UUID       `json:"transaction_id"`
	FromCurrency    string          `json:"from_currency"`
	ToCurrency      string          `json:"to_currency"`
	OriginalAmount  decimal.Decimal `json:"original_amount"`
	ConvertedAmount decimal.Decimal `json:"converted_amount"`
	Rate            decimal.Decimal `json:"rate"`
	Status          string          `json:"status"`
}

func (r *ExchangeRateRepository) ExecuteExchange(
	ctx context.Context,
	accountID uuid.UUID,
	fromCurrency, toCurrency string,
	fromAmount, toAmount, rate decimal.Decimal,
) (*ExchangeResult, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	balanceQuery := `
		SELECT id, currency, balance
		FROM account_balances
		WHERE account_id = $1 AND currency IN ($2, $3)
		ORDER BY id ASC
		FOR UPDATE;
	`
	rows, err := tx.Query(ctx, balanceQuery, accountID, fromCurrency, toCurrency)
	if err != nil {
		return nil, fmt.Errorf("failed to lock balances: %w", err)
	}
	defer rows.Close()

	type balanceRow struct {
		id       uuid.UUID
		currency string
		balance  decimal.Decimal
	}

	var balances []balanceRow
	for rows.Next() {
		var b balanceRow
		if err := rows.Scan(&b.id, &b.currency, &b.balance); err != nil {
			return nil, err
		}
		balances = append(balances, b)
	}

	var fromBal, toBal *balanceRow
	for i := range balances {
		if balances[i].currency == fromCurrency {
			fromBal = &balances[i]
		}
		if balances[i].currency == toCurrency {
			toBal = &balances[i]
		}
	}

	if fromBal == nil || toBal == nil {
		return nil, ErrBalanceNotFound
	}

	if fromBal.balance.LessThan(fromAmount) {
		return nil, ErrInsufficientFunds
	}

	_, err = tx.Exec(ctx, `
		UPDATE account_balances
		SET balance = ROUND((balance - $1::numeric)::numeric, 2), updated_at = NOW()
		WHERE id = $2;
	`, fromAmount, fromBal.id)
	if err != nil {
		return nil, fmt.Errorf("failed to debit from_currency: %w", err)
	}

	_, err = tx.Exec(ctx, `
		UPDATE account_balances
		SET balance = ROUND((balance + $1::numeric)::numeric, 2), updated_at = NOW()
		WHERE id = $2;
	`, toAmount, toBal.id)
	if err != nil {
		return nil, fmt.Errorf("failed to credit to_currency: %w", err)
	}

	txID := uuid.New()
	desc := fmt.Sprintf("Обмен валюты %s -> %s по курсу %s", fromCurrency, toCurrency, rate.StringFixed(4))
	_, err = tx.Exec(ctx, `
		INSERT INTO transactions (id, sender_account_id, receiver_account_id, amount, currency, type, status, description, created_at)
		VALUES ($1, $2, $2, $3, $4, 'exchange', 'completed', $5, NOW());
	`, txID, accountID, fromAmount, fromCurrency, desc)
	if err != nil {
		return nil, fmt.Errorf("failed to insert transaction: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO entries (id, transaction_id, account_id, currency, amount, direction, created_at)
		VALUES
			($1, $2, $3, $4, $5, 'debit', NOW()),
			($6, $2, $3, $7, $8, 'credit', NOW());
	`, uuid.New(), txID, accountID, fromCurrency, fromAmount, uuid.New(), toCurrency, toAmount)
	if err != nil {
		return nil, fmt.Errorf("failed to insert entries: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit exchange tx: %w", err)
	}

	return &ExchangeResult{
		TransactionID:   txID,
		FromCurrency:    fromCurrency,
		ToCurrency:      toCurrency,
		OriginalAmount:  fromAmount,
		ConvertedAmount: toAmount,
		Rate:            rate,
		Status:          "completed",
	}, nil
}
