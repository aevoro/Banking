package http

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"banking/internal/service"
)

type ExchangeHandler struct {
	exchangeService *service.ExchangeService
}

func NewExchangeHandler(exchangeService *service.ExchangeService) *ExchangeHandler {
	return &ExchangeHandler{exchangeService: exchangeService}
}

// Convert обрабатывает GET /api/v1/exchange/convert?from=USD&to=BYN&amount=100
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

	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil || amount <= 0 {
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
		if errors.Is(err, service.ErrCurrencyNotSupported) {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		if errors.Is(err, service.ErrInvalidAmount) {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		http.Error(w, "internal server error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}
