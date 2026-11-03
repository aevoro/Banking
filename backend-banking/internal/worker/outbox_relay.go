package worker

import (
	"context"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"banking/internal/transport/kafka"
)

type OutboxRelayWorker struct {
	pool      *pgxpool.Pool
	producer  *kafka.Producer
	interval  time.Duration
	batchSize int
}

func NewOutboxRelayWorker(pool *pgxpool.Pool, producer *kafka.Producer, interval time.Duration) *OutboxRelayWorker {
	return &OutboxRelayWorker{
		pool:      pool,
		producer:  producer,
		interval:  interval,
		batchSize: 50,
	}
}

func (w *OutboxRelayWorker) Start(ctx context.Context) {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	log.Println("[Outbox Relay] Worker started")

	for {
		select {
		case <-ctx.Done():
			log.Println("[Outbox Relay] Worker stopped")
			return
		case <-ticker.C:
			w.processBatch(ctx)
		}
	}
}

type outboxItem struct {
	id      uuid.UUID
	topic   string
	key     string
	payload []byte
}

func (w *OutboxRelayWorker) processBatch(ctx context.Context) {
	query := `
		SELECT id, topic, event_key, payload
		FROM outbox
		WHERE status = 'pending'
		ORDER BY created_at ASC
		LIMIT $1
		FOR UPDATE SKIP LOCKED;
	`

	tx, err := w.pool.Begin(ctx)
	if err != nil {
		log.Printf("[Outbox Relay] Begin tx error: %v", err)
		return
	}
	defer tx.Rollback(ctx)

	rows, err := tx.Query(ctx, query, w.batchSize)
	if err != nil {
		log.Printf("[Outbox Relay] Query error: %v", err)
		return
	}
	defer rows.Close()

	var events []outboxItem
	for rows.Next() {
		var item outboxItem
		if err := rows.Scan(&item.id, &item.topic, &item.key, &item.payload); err != nil {
			log.Printf("[Outbox Relay] Scan error: %v", err)
			continue
		}
		events = append(events, item)
	}

	if len(events) == 0 {
		return
	}

	for _, ev := range events {
		err := w.producer.Publish(ctx, ev.topic, ev.key, ev.payload)
		if err != nil {
			log.Printf("[Outbox Relay] Failed to push event %s to Kafka: %v", ev.id, err)
			_, _ = tx.Exec(ctx, `
				UPDATE outbox
				SET retry_count = retry_count + 1, last_error = $1, updated_at = NOW()
				WHERE id = $2;
			`, err.Error(), ev.id)
			continue
		}

		_, _ = tx.Exec(ctx, `
			UPDATE outbox
			SET status = 'published', published_at = NOW()
			WHERE id = $1;
		`, ev.id)
		log.Printf("[Outbox Relay] Successfully published event %s to topic %s", ev.id, ev.topic)
	}

	if err := tx.Commit(ctx); err != nil {
		log.Printf("[Outbox Relay] Commit tx error: %v", err)
	}
}
