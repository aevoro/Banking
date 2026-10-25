package http

import "net/http"

type RouterConfig struct {
	AuthHandler         *AuthHandler
	TransferHandler     *TransferHandler
	ExchangeHandler     *ExchangeHandler
	AccountHandler      *AccountHandler
	OrganizationHandler *OrganizationHandler
	HealthHandler       *HealthHandler
}

func NewRouter(cfg RouterConfig) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/health", cfg.HealthHandler.Check)

	mux.HandleFunc("/api/v1/auth/register", cfg.AuthHandler.Register)
	mux.HandleFunc("/api/v1/auth/login", cfg.AuthHandler.Login)
	mux.HandleFunc("/api/v1/exchange/convert", cfg.ExchangeHandler.Convert)

	mux.HandleFunc("/api/v1/accounts", AuthMiddleware(cfg.AccountHandler.GetAccount))
	mux.HandleFunc("/api/v1/accounts/balances", AuthMiddleware(cfg.AccountHandler.OpenBalance))
	mux.HandleFunc("/api/v1/transfers", AuthMiddleware(cfg.TransferHandler.Transfer))
	mux.HandleFunc("/api/v1/exchange", AuthMiddleware(cfg.ExchangeHandler.Exchange))
	mux.HandleFunc("/api/v1/organizations", AuthMiddleware(cfg.OrganizationHandler.RegisterOrganization))

	return mux
}
