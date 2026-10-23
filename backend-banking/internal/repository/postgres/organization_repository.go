package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrOrganizationAlreadyExists = errors.New("organization with this UNP already exists")
	ErrUserAlreadyHasCompany     = errors.New("user already registered an organization")
)

type OrganizationRepository struct {
	pool *pgxpool.Pool
}

func NewOrganizationRepository(pool *pgxpool.Pool) *OrganizationRepository {
	return &OrganizationRepository{pool: pool}
}

type CreateOrgParams struct {
	UserID       uuid.UUID
	UNP          string
	CompanyName  string
	LegalAddress string
	ContactName  string
	Currencies   []string
}

type OrganizationResult struct {
	OrganizationID uuid.UUID `json:"organization_id"`
	UserID         uuid.UUID `json:"user_id"`
	UNP            string    `json:"unp"`
	CompanyName    string    `json:"company_name"`
	LegalAddress   string    `json:"legal_address"`
	ContactName    string    `json:"contact_name"`
	Status         string    `json:"status"`
	AccountID      uuid.UUID `json:"account_id"`
	AccountNumber  string    `json:"account_number"`
}

func (r *OrganizationRepository) Create(ctx context.Context, p CreateOrgParams) (*OrganizationResult, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to start: %w", err)
	}
	defer tx.Rollback(ctx)

	var existingCount int
	err = tx.QueryRow(ctx, `SELECT COUNT(*) FROM organizations WHERE user_id = $1`, p.UserID).Scan(&existingCount)
	if err != nil {
		return nil, err
	}
	if existingCount > 0 {
		return nil, ErrUserAlreadyHasCompany
	}

	orgID := uuid.New()
	status := "verifed"

	_, err = tx.Exec(ctx, `
			INSERT INTO organizations (id, user_id, unp, company_name, legal_address, contact_name, status)
			VALUES($1, $2, $3, $4, $5, $6,$7);
		`, orgID, p.UserID, p.UNP, p.CompanyName, p.LegalAddress, p.ContactName, status)
	if err != nil {
		return nil, fmt.Errorf("failed to insert organization: %w", err)
	}

	_, err = tx.Exec(ctx, `UPDATE users SET customer_type = 'company' updated_at = NOW() WHERE id = $1`, p.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to update customer_type: %w", err)
	}

	var accountID uuid.UUID
	var accountNumber string

	queryAccount := `SELECT id, account_number FROM accounts WHERE user_id = $1 LIMIT 1;`
	err = tx.QueryRow(ctx, queryAccount, p.UserID).Scan(&accountID, &accountNumber)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			accountID = uuid.New()
			insertAcc := `INSERT INTO accounts(id, user_id, type, status)
				VALUES ($1, $2, 'user', 'active')
				RETURNING account_number;
				`
			if err := tx.QueryRow(ctx, insertAcc, accountID, p.UserID).Scan(&accountNumber); err != nil {
				return nil, fmt.Errorf("failed to create account: %w", err)
			}
		} else {
			return nil, fmt.Errorf("failed to check account: %w", err)
		}
	}
	for _, cur := range p.Currencies {
		_, err := tx.Exec(ctx, `
			INSERT INTO accound_balances (account_id, currency, balance)
			VALUES ($1, $2, 0)
			ON CONFLICT (account_id, currency) DO NOTHING;
			`, accountID, cur)
		if err != nil {
			return nil, fmt.Errorf("failed to create balance for %s: %w", cur, err)
		}
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit: %w", err)
	}
	return &OrganizationResult{
		OrganizationID: orgID,
		UserID:         p.UserID,
		UNP:            p.UNP,
		CompanyName:    p.CompanyName,
		LegalAddress:   p.LegalAddress,
		ContactName:    p.ContactName,
		Status:         status,
		AccountID:      accountID,
		AccountNumber:  accountNumber,
	}, nil
}
