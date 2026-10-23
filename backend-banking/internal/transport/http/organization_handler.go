package http

import (
	"banking/internal/repository/postgres"
	"banking/internal/service"
	"banking/internal/validator"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/google/uuid"
)

type OrganizationHandler struct {
	orgService *service.OrganizationService
}

func NewOrganizationHandler(orgService *service.OrganizationService) *OrganizationHandler {
	return &OrganizationHandler{orgService: orgService}
}

func (h *OrganizationHandler) RegisterOrganization(w http.ResponseWriter, r *http.Request) {
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
	var req service.RegisterOrgRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	result, err := h.orgService.RegisterOrganization(r.Context(), userID, req)
	if err != nil {
		switch {
		case errors.Is(err, validator.ErrInvalidUNPFormat), errors.Is(err, validator.ErrInvalidUNPCheckSum):
			http.Error(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, postgres.ErrUserAlreadyHasCompany):
			http.Error(w, err.Error(), http.StatusConflict)
		default:
			http.Error(w, "internal server error: "+err.Error(), http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(result)
}
