package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"

	"banking/internal/repository/postgres"
)

var (
	ErrCurrencyNotSupported = errors.New("currency conversion rate not found")
	ErrInvalidAmount        = errors.New("amount must be greater than zero")
	ErrSameCurrency         = errors.New("cannot exchange to the same currency")
)

type ExchangeService struct {
	rateRepo     *postgres.ExchangeRateRepository
	baseCurrency string
}

func NewExchangeService(rateRepo *postgres.ExchangeRateRepository) *ExchangeService {
	return &ExchangeService{
		rateRepo:     rateRepo,
		baseCurrency: "BYN",
	}
}

type ConvertRequest struct {
	FromCurrency string          `json:"from_currency"`
	ToCurrency   string          `json:"to_currency"`
	Amount       decimal.Decimal `json:"amount"`
}

type ConvertResponse struct {
	FromCurrency    string          `json:"from_currency"`
	ToCurrency      string          `json:"to_currency"`
	OriginalAmount  decimal.Decimal `json:"original_amount"`
	ConvertedAmount decimal.Decimal `json:"converted_amount"`
	Rate            decimal.Decimal `json:"rate"`
}

func (s *ExchangeService) Convert(ctx context.Context, req ConvertRequest) (*ConvertResponse, error) {
	from := strings.ToUpper(strings.TrimSpace(req.FromCurrency))
	to := strings.ToUpper(strings.TrimSpace(req.ToCurrency))

	if req.Amount.LessThanOrEqual(decimal.Zero) {
		return nil, ErrInvalidAmount
	}

	if from == to {
		return nil, ErrSameCurrency
	}

	rate, err := s.resolveRate(ctx, from, to)
	if err != nil {
		return nil, err
	}

	convertedAmount := req.Amount.Mul(rate).Round(2)

	return &ConvertResponse{
		FromCurrency:    from,
		ToCurrency:      to,
		OriginalAmount:  req.Amount,
		ConvertedAmount: convertedAmount,
		Rate:            rate,
	}, nil
}

func (s *ExchangeService) ExecuteExchange(ctx context.Context, userID uuid.UUID, req ConvertRequest) (*postgres.ExchangeResult, error) {
	conv, err := s.Convert(ctx, req)
	if err != nil {
		return nil, err
	}

	accountID, err := s.rateRepo.GetAccountIDByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	return s.rateRepo.ExecuteExchange(
		ctx,
		accountID,
		conv.FromCurrency,
		conv.ToCurrency,
		conv.OriginalAmount,
		conv.ConvertedAmount,
		conv.Rate,
	)
}

func (s *ExchangeService) resolveRate(ctx context.Context, from, to string) (decimal.Decimal, error) {
	rate, err := s.rateRepo.GetLatestRate(ctx, from, to)
	if err != nil {
		return decimal.Zero, err
	}
	if rate.GreaterThan(decimal.Zero) {
		return rate, nil
	}

	reverseRate, err := s.rateRepo.GetLatestRate(ctx, to, from)
	if err != nil {
		return decimal.Zero, err
	}
	if reverseRate.GreaterThan(decimal.Zero) {
		return decimal.NewFromInt(1).DivRound(reverseRate, 8), nil
	}

	if from != s.baseCurrency && to != s.baseCurrency {
		rateFromBase, err1 := s.resolveRate(ctx, from, s.baseCurrency)
		rateBaseTo, err2 := s.resolveRate(ctx, s.baseCurrency, to)

		if err1 == nil && err2 == nil {
			return rateFromBase.Mul(rateBaseTo).Round(8), nil
		}
	}

	return decimal.Zero, fmt.Errorf("%w: %s -> %s", ErrCurrencyNotSupported, from, to)
}
