package http

import (
	"banking/internal/storage/redis"
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type HealthHandler struct {
	pool  *pgxpool.Pool
	redis *redis.Client
}

func NewHealthHandler(pool *pgxpool.Pool, redisClient *redis.Client) *HealthHandler {
	return &HealthHandler{pool: pool, redis: redisClient}
}

type HealthResponse struct {
	Status    string            `json:"status"`
	Timestamp string            `json:"timestamp"`
	Services  map[string]string `json:"services"`
}

func (h *HealthHandler) Check(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	services := make(map[string]string)
	isHealthy := true

	if err := h.pool.Ping(ctx); err != nil {
		services["postgres"] = "down: " + err.Error()
		isHealthy = false
	} else {
		services["postgres"] = "up"
	}

	if err := h.redis.Ping(ctx); err != nil {
		services["redis"] = "down: " + err.Error()
		isHealthy = false
	} else {
		services["redis"] = "up"
	}

	resp := HealthResponse{
		Status:    "ok",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Services:  services,
	}

	w.Header().Set("Content-Type", "application/json")
	if !isHealthy {
		resp.Status = "degraded"
		w.WriteHeader(http.StatusServiceUnavailable)
		_ = json.NewEncoder(w).Encode(resp)
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}
