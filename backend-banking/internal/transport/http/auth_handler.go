package http

import (
	"banking/internal/domain"
	"banking/internal/service"
	"encoding/json"
	"errors"
	"net/http"
)

type AuthHandler struct {
	authService service.AuthServise
}

func NewAuthHandler(authServise *service.AuthServise) *AuthHandler {
	return &AuthHandler{authService: *authServise}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req service.RegisterInput
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	user, err := h.authService.Register(r.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrUsersAlreadyExists):
			http.Error(w, err.Error(), http.StatusConflict)
		case errors.Is(err, domain.ErrInvalidPhone):
			http.Error(w, err.Error(), http.StatusBadRequest)
		default:
			http.Error(w, "internal server error: "+err.Error(), http.StatusInternalServerError)
		}
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(user)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {

	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req service.LoginInput
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	resp, err := h.authService.Login(r.Context(), req)
	if err != nil {
		if err.Error() == "invalid phone or password" {
			http.Error(w, err.Error(), http.StatusUnauthorized)
			return
		}
		if err.Error() == "account is blocked" {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		http.Error(w, "internal server error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}
