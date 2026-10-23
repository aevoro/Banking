package service

import (
	"banking/internal/repository/postgres"
	"banking/internal/validator"
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
)

var (
	ErrMissingRequiredFields = errors.New("company_name, legal_address or contact_name are required")
)

type OrganizationService struct {
	repo *postgres.OrganizationRepository
}

func NewOrganizationService(repo *postgres.OrganizationRepository) *OrganizationService {
	return &OrganizationService{repo: repo}
}

type RegisterOrgRequest struct {
	UNP          string   `json:"unp"`
	CompanyName  string   `json:"company_name"`
	LegalAddress string   `json:"legal_address"`
	ContactName  string   `json:"contact_name"`
	Currencies   []string `json:"currencies"`
}

func (s *OrganizationService) RegisterOrganization(ctx context.Context, userID uuid.UUID, req RegisterOrgRequest) (*postgres.OrganizationResult, error) {
	req.UNP = strings.TrimSpace(req.UNP)
	req.CompanyName = strings.TrimSpace(req.CompanyName)
	req.LegalAddress = strings.TrimSpace(req.LegalAddress)
	req.ContactName = strings.TrimSpace(req.ContactName)

	if err := validator.ValidateUnp(req.UNP); err != nil {
		return nil, err
	}
	if req.CompanyName == "" || req.LegalAddress == "" || req.ContactName == "" {
		return nil, ErrMissingRequiredFields
	}

	if len(req.Currencies) == 0 {
		req.Currencies = []string{"BYN"}
	}

	params := postgres.CreateOrgParams{
		UserID:       userID,
		UNP:          req.UNP,
		CompanyName:  req.CompanyName,
		LegalAddress: req.LegalAddress,
		ContactName:  req.ContactName,
		Currencies:   req.Currencies,
	}

	return s.repo.Create(ctx, params)
}
