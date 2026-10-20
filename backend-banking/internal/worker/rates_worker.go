package worker

import (
	"context"
	"log"
	"time"

	"banking/internal/client/nbrb"
	"banking/internal/repository/postgres"
)

type RatesSyncWorker struct {
	client   *nbrb.Client
	repo     *postgres.ExchangeRateRepository
	interval time.Duration
}

func NewRatesSyncWorker(repo *postgres.ExchangeRateRepository, interval time.Duration) *RatesSyncWorker {
	return &RatesSyncWorker{
		client:   nbrb.NewClient(),
		repo:     repo,
		interval: interval,
	}
}

func (w *RatesSyncWorker) Start(ctx context.Context) {
	w.sync(ctx)

	go func() {
		ticker := time.NewTicker(w.interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				log.Println("Rates sync worker stopped")
				return
			case <-ticker.C:
				w.sync(ctx)
			}
		}
	}()
}

func (w *RatesSyncWorker) sync(ctx context.Context) {
	syncCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	rates, err := w.client.FetchRates(syncCtx)
	if err != nil {
		log.Printf("[Rates Worker] Error fetching rates from NBRB: %v", err)
		return
	}

	if err := w.repo.SaveRates(syncCtx, rates, "BYN"); err != nil {
		log.Printf("[Rates Worker] Error saving rates to DB: %v", err)
		return
	}

	log.Printf("[Rates Worker] Exchange rates updated from NBRB (USD: %.4f, EUR: %.4f, RUB: %.5f)",
		rates["USD"], rates["EUR"], rates["RUB"])
}
