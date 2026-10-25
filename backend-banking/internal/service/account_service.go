package service

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"

	"banking/internal/repository/postgres"
)

var (
	ErrUnsupportedCurrency = errors.New("unsupported currency code")
)

var supportedCurrencies = map[string]bool{
	"BYN": true,
	"USD": true,
	"EUR": true,
	"RUB": true,
}

type AccountService struct {
	repo *postgres.AccountRepository
}

func NewAccountService(repo *postgres.AccountRepository) *AccountService {
	return &AccountService{repo: repo}
}

func (s *AccountService) GetUserAccount(ctx context.Context, userID uuid.UUID) (*postgres.AccountDetails, error) {
	return s.repo.GetAccountWithBalances(ctx, userID)
}

type AddBalanceRequest struct {
	Currency string `json:"currency"`
}

func (s *AccountService) OpenBalancePocket(ctx context.Context, userID uuid.UUID, req AddBalanceRequest) (*postgres.BalanceView, error) {
	curr := strings.ToUpper(strings.TrimSpace(req.Currency))
	if !supportedCurrencies[curr] {
		return nil, ErrUnsupportedCurrency
	}

	return s.repo.AddBalancePocket(ctx, userID, curr)
}
