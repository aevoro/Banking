package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/shopspring/decimal"

	"banking/internal/repository/postgres"
	"banking/internal/service"
	"banking/internal/storage/redis"
	transportHttp "banking/internal/transport/http"
	"banking/internal/transport/kafka"
	"banking/internal/worker"
)

func main() {
	decimal.MarshalJSONWithoutQuotes = true

	if err := godotenv.Load(); err != nil {
		_ = godotenv.Load("backend-banking/.env")
	}

	ctx := context.Background()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	dbPool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("failed to connect to db: %v", err)
	}
	defer dbPool.Close()

	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	redisClient, err := redis.New(redisAddr, "")
	if err != nil {
		log.Fatalf("Failed to initialize Redis: %v", err)
	}
	defer redisClient.Close()
	log.Println("Connected to Redis successfully")

	kafkaBrokersStr := os.Getenv("KAFKA_BROKERS")
	if kafkaBrokersStr == "" {
		kafkaBrokersStr = "localhost:29092"
	}
	kafkaProducer := kafka.NewProducer([]string{kafkaBrokersStr})
	defer kafkaProducer.Close()

	outboxWorker := worker.NewOutboxRelayWorker(dbPool, kafkaProducer, 2*time.Second)
	go outboxWorker.Start(ctx)

	userRepo := postgres.NewUserRepository(dbPool)
	transferRepo := postgres.NewTransferRepository(dbPool)
	exchangeRepo := postgres.NewExchangeRateRepository(dbPool)
	orgRepo := postgres.NewOrganizationRepository(dbPool)
	accRepo := postgres.NewAccountRepository(dbPool)

	authService := service.NewAuthService(dbPool, userRepo)
	transferService := service.NewTransferService(transferRepo)
	exchangeService := service.NewExchangeService(exchangeRepo)
	orgService := service.NewOrganizationService(orgRepo)
	accService := service.NewAccountService(accRepo)

	ratesWorker := worker.NewRatesSyncWorker(exchangeRepo, 1*time.Hour)
	go ratesWorker.Start(ctx)

	authHandler := transportHttp.NewAuthHandler(authService)
	transferHandler := transportHttp.NewTransferHandler(transferService)
	exchangeHandler := transportHttp.NewExchangeHandler(exchangeService)
	orgHandler := transportHttp.NewOrganizationHandler(orgService)
	healthHandler := transportHttp.NewHealthHandler(dbPool, redisClient)
	accHandler := transportHttp.NewAccountHandler(accService)

	router := transportHttp.NewRouter(transportHttp.RouterConfig{
		RedisClient:         redisClient,
		AuthHandler:         authHandler,
		TransferHandler:     transferHandler,
		ExchangeHandler:     exchangeHandler,
		AccountHandler:      accHandler,
		OrganizationHandler: orgHandler,
		HealthHandler:       healthHandler,
	})

	port := ":8080"
	log.Printf("Server is running on http://localhost%s", port)
	if err := http.ListenAndServe(port, router); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
