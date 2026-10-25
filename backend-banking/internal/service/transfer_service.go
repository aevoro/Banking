package service

import (
	"context"
	"strings"

	"banking/internal/domain"
	"banking/internal/repository/postgres"

	"github.com/shopspring/decimal"
)

type TransferService struct {
	transferRepo *postgres.TransferRepository
}

func NewTransferService(transferRepo *postgres.TransferRepository) *TransferService {
	return &TransferService{transferRepo: transferRepo}
}

func (s *TransferService) Transfer(ctx context.Context, params domain.TransferParams) (*domain.TransferResult, error) {
	if params.Amount.LessThanOrEqual(decimal.Zero) {
		return nil, domain.ErrInvalidAmount
	}

	currency := strings.ToUpper(strings.TrimSpace(params.Currency))
	recipient := strings.TrimSpace(params.Recipient)

	senderAcc, err := s.transferRepo.FindAccountByUserID(ctx, params.SenderUserID)
	if err != nil {
		return nil, err
	}

	var receiverAcc *postgres.AccountInfo
	switch params.RecipientType {
	case domain.RecipientByPhone:
		phone := strings.ReplaceAll(recipient, " ", "")
		phone = strings.ReplaceAll(recipient, "-", "")
		receiverAcc, err = s.transferRepo.FindAccountByPhone(ctx, phone)
	case domain.RecipientByAccountNumber:
		receiverAcc, err = s.transferRepo.FindAccountByAccountNumber(ctx, recipient)
	default:
		return nil, domain.ErrAccountNotFound
	}
	if err != nil {
		return nil, err
	}

	if senderAcc.AccountID == receiverAcc.AccountID {
		return nil, domain.ErrSelfTransfer
	}

	return s.transferRepo.ExecuteTransfer(
		ctx,
		senderAcc.AccountID,
		receiverAcc.AccountID,
		currency,
		params.Amount,
		params.Description,
	)
}
