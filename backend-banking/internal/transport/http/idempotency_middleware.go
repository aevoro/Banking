package http

import (
	"bytes"
	"context"
	"net/http"
	"time"

	"banking/internal/storage/redis"
)

type responseCaptureWriter struct {
	http.ResponseWriter
	body       *bytes.Buffer
	statusCode int
}

func (w *responseCaptureWriter) WriteHeader(code int) {
	w.statusCode = code
	w.ResponseWriter.WriteHeader(code)
}

func (w *responseCaptureWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func IdempotencyMiddleware(redisClient *redis.Client, ttl time.Duration) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			idempKey := r.Header.Get("Idempotency-Key")
			if idempKey == "" {
				next(w, r)
				return
			}

			ctx := r.Context()

			// Проверяем, есть ли уже сохраненный ответ
			cachedResponse, err := redisClient.GetIdempotencyResponse(ctx, idempKey)
			if err == nil {
				if string(cachedResponse) == "processing" {
					http.Error(w, `{"error":"request is currently being processed"}`, http.StatusConflict)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("X-Cache-Lookup", "HIT-IDEMPOTENCY")
				w.WriteHeader(http.StatusOK)
				_, _ = w.Write(cachedResponse)
				return
			}

			locked, err := redisClient.TryLockIdempotencyKey(ctx, idempKey, ttl)
			if err != nil || !locked {
				http.Error(w, `{"error":"concurrent request conflict"}`, http.StatusConflict)
				return
			}

			writerProxy := &responseCaptureWriter{
				ResponseWriter: w,
				body:           &bytes.Buffer{},
				statusCode:     http.StatusOK,
			}

			next(writerProxy, r)

			if writerProxy.statusCode >= 200 && writerProxy.statusCode < 300 {
				_ = redisClient.SaveIdempotencyResponse(context.Background(), idempKey, writerProxy.body.Bytes(), ttl)
			}
		}
	}
}
