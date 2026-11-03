package http

import (
	"net/http"
	"time"

	"banking/internal/storage/redis"
)

type RouterConfig struct {
	RedisClient         *redis.Client
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

	idempMiddleware := IdempotencyMiddleware(cfg.RedisClient, 24*time.Hour)

	mux.HandleFunc("/api/v1/accounts", AuthMiddleware(cfg.AccountHandler.GetAccount))
	mux.HandleFunc("/api/v1/accounts/balances", AuthMiddleware(cfg.AccountHandler.OpenBalance))

	mux.HandleFunc("/api/v1/transfers", AuthMiddleware(idempMiddleware(cfg.TransferHandler.Transfer)))
	mux.HandleFunc("/api/v1/exchange", AuthMiddleware(idempMiddleware(cfg.ExchangeHandler.Exchange)))

	mux.HandleFunc("/api/v1/organizations", AuthMiddleware(cfg.OrganizationHandler.RegisterOrganization))

	return mux
}
