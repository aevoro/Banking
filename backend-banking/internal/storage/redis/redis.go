package redis

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type Client struct {
	rdb *redis.Client
}

func New(addr string, password string) (*Client, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:         addr,
		Password:     password,
		DB:           0,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to redis at %s: %w", addr, err)
	}

	return &Client{rdb: rdb}, nil
}

func (c *Client) Close() error {
	return c.rdb.Close()
}

func (c *Client) TryLockIdempotencyKey(ctx context.Context, key string, ttl time.Duration) (bool, error) {
	redisKey := fmt.Sprintf("idempotency:%s", key)
	return c.rdb.SetNX(ctx, redisKey, "processing", ttl).Result()
}

func (c *Client) SaveIdempotencyResponse(ctx context.Context, key string, responseBody []byte, ttl time.Duration) error {
	redisKey := fmt.Sprintf("idempotency:%s", key)
	return c.rdb.Set(ctx, redisKey, responseBody, ttl).Err()
}

func (c *Client) GetIdempotencyResponse(ctx context.Context, key string) ([]byte, error) {
	redisKey := fmt.Sprintf("idempotency:%s", key)
	return c.rdb.Get(ctx, redisKey).Bytes()
}

func (c *Client) Ping(ctx context.Context) error {
	return c.rdb.Ping(ctx).Err()
}
