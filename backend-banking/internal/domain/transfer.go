package domain

import (
	"errors"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

var (
	ErrInsufficientFunds     = errors.New("insufficient funds")
	ErrSelfTransfer          = errors.New("cannot transfer funds to yourself")
	ErrAccountNotFound       = errors.New("recipient account not found")
	ErrBalanceNotFound       = errors.New("currency balance pocket not found")
	ErrInvalidAmount         = errors.New("amount must be greater than zero")
	ErrSenderAccountNotFound = errors.New("sender account not found")
)

type TransferRecipientType string

const (
	RecipientByPhone         TransferRecipientType = "phone"
	RecipientByAccountNumber TransferRecipientType = "account_number"
)

type TransferParams struct {
	SenderUserID  uuid.UUID
	RecipientType TransferRecipientType
	Recipient     string
	Currency      string
	Amount        decimal.Decimal
	Description   string
}

type TransferResult struct {
	TransactionID uuid.UUID       `json:"transaction_id"`
	Currency      string          `json:"currency"`
	Amount        decimal.Decimal `json:"amount"`
	Status        string          `json:"status"`
}
