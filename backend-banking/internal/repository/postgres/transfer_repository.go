package postgres

import (
	"context"
	"errors"
	"fmt"

	"banking/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TransferRepository struct {
	pool *pgxpool.Pool
}

func NewTransferRepository(pool *pgxpool.Pool) *TransferRepository {
	return &TransferRepository{pool: pool}
}

type AccountInfo struct {
	AccountID uuid.UUID
	UserID    uuid.UUID
	Status    string
}

func (r *TransferRepository) FindAccountByUserID(ctx context.Context, userID uuid.UUID) (*AccountInfo, error) {
	query := `
		SELECT id, user_id, status
		FROM accounts
		WHERE user_id = $1
		LIMIT 1;
	`
	var acc AccountInfo
	// Порядок колонок: id -> AccountID, user_id -> UserID
	err := r.pool.QueryRow(ctx, query, userID).Scan(&acc.AccountID, &acc.UserID, &acc.Status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrSenderAccountNotFound
		}
		return nil, fmt.Errorf("failed to find sender account: %w", err)
	}
	return &acc, nil
}

func (r *TransferRepository) FindAccountByPhone(ctx context.Context, phone string) (*AccountInfo, error) {
	query := `
		SELECT a.id, a.user_id, a.status
		FROM accounts a
		JOIN users u ON a.user_id = u.id
		WHERE u.phone = $1
		LIMIT 1;
	`
	var acc AccountInfo
	// Порядок колонок: a.id -> AccountID, a.user_id -> UserID
	err := r.pool.QueryRow(ctx, query, phone).Scan(&acc.AccountID, &acc.UserID, &acc.Status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrAccountNotFound
		}
		return nil, fmt.Errorf("failed to find recipient account by phone: %w", err)
	}
	return &acc, nil
}

func (r *TransferRepository) FindAccountByAccountNumber(ctx context.Context, accountNumber string) (*AccountInfo, error) {
	query := `
		SELECT id, user_id, status
		FROM accounts
		WHERE account_number = $1
		LIMIT 1;
	`
	var acc AccountInfo
	// Порядок колонок: id -> AccountID, user_id -> UserID
	err := r.pool.QueryRow(ctx, query, accountNumber).Scan(&acc.AccountID, &acc.UserID, &acc.Status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrAccountNotFound
		}
		return nil, fmt.Errorf("failed to find recipient account by account number: %w", err)
	}
	return &acc, nil
}

func (r *TransferRepository) ExecuteTransfer(
	ctx context.Context,
	senderAccountID, receiverAccountID uuid.UUID,
	currency string,
	amount float64,
	description string,
) (*domain.TransferResult, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	balanceQuery := `
		SELECT id, account_id, balance
		FROM account_balances
		WHERE account_id IN ($1, $2) AND currency = $3
		ORDER BY id ASC
		FOR UPDATE;
	`

	rows, err := tx.Query(ctx, balanceQuery, senderAccountID, receiverAccountID, currency)
	if err != nil {
		return nil, fmt.Errorf("failed to lock balance: %w", err)
	}
	defer rows.Close()

	type balanceRow struct {
		id        uuid.UUID
		accountID uuid.UUID
		balance   float64
	}

	var balances []balanceRow
	for rows.Next() {
		var b balanceRow
		if err := rows.Scan(&b.id, &b.accountID, &b.balance); err != nil {
			return nil, err
		}
		balances = append(balances, b)
	}

	var senderBalance, receiverBalance *balanceRow

	for i := range balances {
		if balances[i].accountID == senderAccountID {
			senderBalance = &balances[i]
		}
		if balances[i].accountID == receiverAccountID {
			receiverBalance = &balances[i]
		}
	}

	if senderBalance == nil || receiverBalance == nil {
		return nil, domain.ErrBalanceNotFound
	}

	if senderBalance.balance < amount {
		return nil, domain.ErrInsufficientFunds
	}

	_, err = tx.Exec(ctx, `
    UPDATE account_balances
    SET balance = ROUND((balance - $1::numeric)::numeric, 2), updated_at = NOW()
    WHERE id = $2;
	`, amount, senderBalance.id)
	if err != nil {
		return nil, fmt.Errorf("failed to debit sender: %w", err)
	}

	_, err = tx.Exec(ctx, `
    UPDATE account_balances
    SET balance = ROUND((balance + $1::numeric)::numeric, 2), updated_at = NOW()
    WHERE id = $2;
	`, amount, receiverBalance.id)
	if err != nil {
		return nil, fmt.Errorf("failed to credit receiver: %w", err)
	}

	transactionID := uuid.New()
	_, err = tx.Exec(ctx, `
		INSERT INTO transactions (id, sender_account_id, receiver_account_id, amount, currency, type, status, description, created_at)
		VALUES ($1, $2, $3, $4, $5, 'transfer', 'completed', $6, NOW());
	`, transactionID, senderAccountID, receiverAccountID, amount, currency, description)
	if err != nil {
		return nil, fmt.Errorf("failed to create transaction: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO entries (id, transaction_id, account_id, currency, amount, direction, created_at)
		VALUES
			($1, $2, $3, $4, $5, 'debit', NOW()),
			($6, $2, $7, $4, $5, 'credit', NOW());
	`, uuid.New(), transactionID, senderAccountID, currency, amount, uuid.New(), receiverAccountID)
	if err != nil {
		return nil, fmt.Errorf("failed to create entries: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transfer tx: %w", err)
	}

	return &domain.TransferResult{
		TransactionID: transactionID,
		Currency:      currency,
		Amount:        amount,
		Status:        "completed",
	}, nil
}
