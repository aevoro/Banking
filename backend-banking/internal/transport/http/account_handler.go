package http

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/google/uuid"

	"banking/internal/repository/postgres"
	"banking/internal/service"
)

type AccountHandler struct {
	service *service.AccountService
}

func NewAccountHandler(service *service.AccountService) *AccountHandler {
	return &AccountHandler{service: service}
}

func (h *AccountHandler) GetAccount(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userIDVal := r.Context().Value(UserIDContextKey)
	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	account, err := h.service.GetUserAccount(r.Context(), userID)
	if err != nil {
		if errors.Is(err, postgres.ErrAccountNotFound) {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get account: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(account)
}

func (h *AccountHandler) OpenBalance(w http.ResponseWriter, r *http.Request) {
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

	var req service.AddBalanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	balance, err := h.service.OpenBalancePocket(r.Context(), userID, req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrUnsupportedCurrency):
			http.Error(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, postgres.ErrCurrencyAlreadyExists):
			http.Error(w, err.Error(), http.StatusConflict)
		case errors.Is(err, postgres.ErrAccountNotFound):
			http.Error(w, err.Error(), http.StatusNotFound)
		default:
			http.Error(w, "internal server error: "+err.Error(), http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(balance)
}
