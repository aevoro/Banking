package http

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"

	"banking/internal/repository/postgres"
	"banking/internal/service"
)

type ExchangeHandler struct {
	exchangeService *service.ExchangeService
}

func NewExchangeHandler(exchangeService *service.ExchangeService) *ExchangeHandler {
	return &ExchangeHandler{exchangeService: exchangeService}
}

func (h *ExchangeHandler) Convert(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	amountStr := r.URL.Query().Get("amount")

	if from == "" || to == "" {
		http.Error(w, "query parameters 'from' and 'to' are required", http.StatusBadRequest)
		return
	}

	amount, err := decimal.NewFromString(amountStr)
	if err != nil || amount.LessThanOrEqual(decimal.Zero) {
		http.Error(w, "invalid or missing 'amount' query parameter", http.StatusBadRequest)
		return
	}

	req := service.ConvertRequest{
		FromCurrency: from,
		ToCurrency:   to,
		Amount:       amount,
	}

	resp, err := h.exchangeService.Convert(r.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrCurrencyNotSupported):
			http.Error(w, err.Error(), http.StatusNotFound)
		case errors.Is(err, service.ErrInvalidAmount), errors.Is(err, service.ErrSameCurrency):
			http.Error(w, err.Error(), http.StatusBadRequest)
		default:
			http.Error(w, "internal server error: "+err.Error(), http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

func (h *ExchangeHandler) Exchange(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userIDVal := r.Context().Value(UserIDContextKey)
	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req service.ConvertRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	result, err := h.exchangeService.ExecuteExchange(r.Context(), userID, req)
	if err != nil {
		switch {
		case errors.Is(err, postgres.ErrInsufficientFunds):
			http.Error(w, "insufficient funds on balance", http.StatusPaymentRequired) // 402
		case errors.Is(err, postgres.ErrBalanceNotFound):
			http.Error(w, "currency balance pocket not found", http.StatusNotFound)
		case errors.Is(err, postgres.ErrAccountNotFound):
			http.Error(w, "account not found", http.StatusNotFound)
		case errors.Is(err, service.ErrCurrencyNotSupported):
			http.Error(w, err.Error(), http.StatusNotFound)
		case errors.Is(err, service.ErrInvalidAmount), errors.Is(err, service.ErrSameCurrency):
			http.Error(w, err.Error(), http.StatusBadRequest)
		default:
			http.Error(w, "internal server error: "+err.Error(), http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(result)
}
