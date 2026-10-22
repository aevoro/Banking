package http

import (
	"banking/internal/domain"
	"banking/internal/service"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/google/uuid"
)

type TransferHandler struct {
	transferService *service.TransferService
}

func NewTransferHandler(transferService *service.TransferService) *TransferHandler {
	return &TransferHandler{transferService: transferService}
}

type TransferRequest struct {
	RecipientType string  `json:"recipient_type"`
	Recipient     string  `json:"recipient"`
	Currency      string  `json:"currency"`
	Amount        float64 `json:"amount"`
	Description   string  `json:"description"`
}

func (h *TransferHandler) Transfer(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method is not allowed", http.StatusMethodNotAllowed)
		return
	}

	userIDVal := r.Context().Value(UserIDContextKey)
	senderUserID, ok := userIDVal.(uuid.UUID)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req TransferRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body"+err.Error(), http.StatusBadRequest)
		return
	}

	params := domain.TransferParams{
		SenderUserID:  senderUserID,
		RecipientType: domain.TransferRecipientType(req.RecipientType),
		Recipient:     req.Recipient,
		Currency:      req.Currency,
		Amount:        req.Amount,
		Description:   req.Description,
	}

	result, err := h.transferService.Transfer(r.Context(), params)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrInsufficientFunds):
			http.Error(w, err.Error(), http.StatusPaymentRequired)
		case errors.Is(err, domain.ErrSelfTransfer), errors.Is(err, domain.ErrInvalidAmount):
			http.Error(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, domain.ErrAccountNotFound), errors.Is(err, domain.ErrBalanceNotFound):
			http.Error(w, err.Error(), http.StatusNotFound)
		default:
			http.Error(w, "internal server error: "+err.Error(), http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(result)
}
