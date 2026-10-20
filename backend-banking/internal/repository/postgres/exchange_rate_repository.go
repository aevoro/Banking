package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ExchangeRateRepository struct {
	pool *pgxpool.Pool
}

func NewExchangeRateRepository(pool *pgxpool.Pool) *ExchangeRateRepository {
	return &ExchangeRateRepository{pool: pool}
}

func (r *ExchangeRateRepository) GetLatestRate(ctx context.Context, from, to string) (float64, error) {
	query := `
		SELECT rate
		FROM exchange_rates
		WHERE from_currency = $1 AND to_currency = $2
		ORDER BY created_at DESC
		LIMIT 1;
	`
	var rate float64
	err := r.pool.QueryRow(ctx, query, from, to).Scan(&rate)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, nil
		}
		return 0, fmt.Errorf("failed to query exchange rate: %w", err)
	}
	return rate, nil
}

func (r *ExchangeRateRepository) SaveRates(ctx context.Context, rates map[string]float64, baseCurrency string) error {
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
		if !ok || rate <= 0 {
			continue
		}

		if _, err := tx.Exec(ctx, query, cur, baseCurrency, rate); err != nil {
			return fmt.Errorf("failed to insert rate for %s: %w", cur, err)
		}
	}

	return tx.Commit(ctx)
}
