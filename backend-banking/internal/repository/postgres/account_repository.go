package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

var (
	ErrCurrencyAlreadyExists = errors.New("balance pocket for this currency already exists")
)

type AccountRepository struct {
	pool *pgxpool.Pool
}

func NewAccountRepository(pool *pgxpool.Pool) *AccountRepository {
	return &AccountRepository{pool: pool}
}

type BalanceView struct {
	ID        uuid.UUID       `json:"id"`
	Currency  string          `json:"currency"`
	Balance   decimal.Decimal `json:"balance"`
	CreatedAt string          `json:"created_at"`
}

type AccountDetails struct {
	AccountID     uuid.UUID     `json:"account_id"`
	AccountNumber string        `json:"account_number"`
	Status        string        `json:"status"`
	Balances      []BalanceView `json:"balances"`
}

func (r *AccountRepository) GetAccountWithBalances(ctx context.Context, userID uuid.UUID) (*AccountDetails, error) {
	var acc AccountDetails

	queryAcc := `
		SELECT id, account_number, status
		FROM accounts
		WHERE user_id = $1
		LIMIT 1;
	`
	err := r.pool.QueryRow(ctx, queryAcc, userID).Scan(&acc.AccountID, &acc.AccountNumber, &acc.Status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAccountNotFound
		}
		return nil, fmt.Errorf("failed to get account: %w", err)
	}

	queryBalances := `
		SELECT id, currency, balance, created_at
		FROM account_balances
		WHERE account_id = $1
		ORDER BY currency ASC;
	`
	rows, err := r.pool.Query(ctx, queryBalances, acc.AccountID)
	if err != nil {
		return nil, fmt.Errorf("failed to query balances: %w", err)
	}
	defer rows.Close()

	acc.Balances = make([]BalanceView, 0)
	for rows.Next() {
		var b BalanceView
		var createdAt any
		if err := rows.Scan(&b.ID, &b.Currency, &b.Balance, &createdAt); err != nil {
			return nil, fmt.Errorf("failed to scan balance: %w", err)
		}
		b.CreatedAt = fmt.Sprintf("%v", createdAt)
		acc.Balances = append(acc.Balances, b)
	}

	return &acc, nil
}

func (r *AccountRepository) AddBalancePocket(ctx context.Context, userID uuid.UUID, currency string) (*BalanceView, error) {
	var accountID uuid.UUID
	err := r.pool.QueryRow(ctx, `SELECT id FROM accounts WHERE user_id = $1 LIMIT 1;`, userID).Scan(&accountID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAccountNotFound
		}
		return nil, fmt.Errorf("failed to get account: %w", err)
	}

	pocketID := uuid.New()
	insertQuery := `
		INSERT INTO account_balances (id, account_id, currency, balance, created_at, updated_at)
		VALUES ($1, $2, $3, 0.00, NOW(), NOW())
		RETURNING created_at;
	`

	var createdAt any
	err = r.pool.QueryRow(ctx, insertQuery, pocketID, accountID, currency).Scan(&createdAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrCurrencyAlreadyExists
		}
		return nil, fmt.Errorf("failed to create balance pocket: %w", err)
	}

	return &BalanceView{
		ID:        pocketID,
		Currency:  currency,
		Balance:   decimal.NewFromInt(0),
		CreatedAt: fmt.Sprintf("%v", createdAt),
	}, nil
}
