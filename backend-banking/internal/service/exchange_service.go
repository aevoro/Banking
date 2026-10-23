package service

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"

	"github.com/google/uuid"

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
	FromCurrency string  `json:"from_currency"`
	ToCurrency   string  `json:"to_currency"`
	Amount       float64 `json:"amount"`
}

type ConvertResponse struct {
	FromCurrency    string  `json:"from_currency"`
	ToCurrency      string  `json:"to_currency"`
	OriginalAmount  float64 `json:"original_amount"`
	ConvertedAmount float64 `json:"converted_amount"`
	Rate            float64 `json:"rate"`
}

func (s *ExchangeService) Convert(ctx context.Context, req ConvertRequest) (*ConvertResponse, error) {
	from := strings.ToUpper(strings.TrimSpace(req.FromCurrency))
	to := strings.ToUpper(strings.TrimSpace(req.ToCurrency))

	if req.Amount <= 0 {
		return nil, ErrInvalidAmount
	}

	if from == to {
		return nil, ErrSameCurrency
	}

	rate, err := s.resolveRate(ctx, from, to)
	if err != nil {
		return nil, err
	}

	convertedAmount := math.Round(req.Amount*rate*100) / 100

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

func (s *ExchangeService) resolveRate(ctx context.Context, from, to string) (float64, error) {
	rate, err := s.rateRepo.GetLatestRate(ctx, from, to)
	if err != nil {
		return 0, err
	}
	if rate > 0 {
		return rate, nil
	}

	reverseRate, err := s.rateRepo.GetLatestRate(ctx, to, from)
	if err != nil {
		return 0, err
	}
	if reverseRate > 0 {
		return 1.0 / reverseRate, nil
	}

	if from != s.baseCurrency && to != s.baseCurrency {
		rateFromBase, err1 := s.resolveRate(ctx, from, s.baseCurrency)
		rateBaseTo, err2 := s.resolveRate(ctx, s.baseCurrency, to)

		if err1 == nil && err2 == nil {
			return rateFromBase * rateBaseTo, nil
		}
	}

	return 0, fmt.Errorf("%w: %s -> %s", ErrCurrencyNotSupported, from, to)
}
