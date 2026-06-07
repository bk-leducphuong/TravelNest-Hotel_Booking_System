package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/nats-io/nats.go"
	analyticsCache "github.com/travelnest/services/analytics/internal/cache"
	"github.com/travelnest/services/analytics/internal/config"
	analyticsEvents "github.com/travelnest/services/analytics/internal/events"
	analyticsHTTP "github.com/travelnest/services/analytics/internal/http"
	analyticsMongo "github.com/travelnest/services/analytics/internal/mongo"
)

func main() {
	if err := godotenv.Load(); err != nil {
		slog.Info("No .env file found, using system environment/defaults")
	}

	cfg := config.Load()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: logLevel(cfg.LogLevel)}))

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	db, disconnect, err := analyticsMongo.Connect(ctx, cfg.MongoDBURI, cfg.MongoDBDatabase)
	if err != nil {
		logger.Error("failed to connect to MongoDB", "error", err)
		os.Exit(1)
	}
	defer disconnect(context.Background())

	repo := analyticsMongo.NewRepository(db)
	if err := repo.EnsureIndexes(ctx); err != nil {
		logger.Error("failed to create MongoDB indexes", "error", err)
		os.Exit(1)
	}

	redisClient, err := analyticsCache.NewRedisClient(cfg.RedisURL)
	if err != nil {
		logger.Warn("failed to configure Redis cache; analytics cache disabled", "error", err)
	}
	var redisCache *analyticsCache.RedisCache
	if redisClient != nil {
		redisCache = analyticsCache.NewRedisCache(redisClient)
		defer redisCache.Close()
		if err := redisCache.Ping(ctx); err != nil {
			logger.Warn("failed to connect to Redis cache; analytics cache will retry per request", "error", err)
		} else {
			logger.Info(
				"connected to Redis cache",
				"trendingHotelsTTL", cfg.TrendingHotelsCacheTTL.String(),
				"trendingDestinationsTTL", cfg.TrendingDestinationsTTL.String(),
			)
		}
	}

	nc, err := nats.Connect(cfg.NATSURL)
	if err != nil {
		logger.Error("failed to connect to NATS", "error", err)
		os.Exit(1)
	}
	defer nc.Drain()

	js, err := nc.JetStream()
	if err != nil {
		logger.Error("failed to initialize JetStream", "error", err)
		os.Exit(1)
	}
	if err := analyticsEvents.EnsureStream(js, cfg.NATSStream); err != nil {
		logger.Error("failed to ensure JetStream stream", "stream", cfg.NATSStream, "error", err)
		os.Exit(1)
	}
	if err := analyticsEvents.NewConsumer(js, cfg.NATSStream, repo, logger).Start(ctx); err != nil {
		logger.Error("failed to start consumers", "error", err)
		os.Exit(1)
	}

	server := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           analyticsHTTP.NewServer(repo, redisCache, cfg.TrendingHotelsCacheTTL, cfg.TrendingDestinationsTTL, logger),
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		logger.Info("analytics service listening", "addr", cfg.HTTPAddr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("http server failed", "error", err)
			stop()
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("http shutdown failed", "error", err)
	}
}

func logLevel(value string) slog.Level {
	switch value {
	case "debug":
		return slog.LevelDebug
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
