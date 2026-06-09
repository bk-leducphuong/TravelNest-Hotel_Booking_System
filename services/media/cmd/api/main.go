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
	"github.com/travelnest/services/media/internal/config"
	mediaEvents "github.com/travelnest/services/media/internal/events"
	mediaHTTP "github.com/travelnest/services/media/internal/http"
	mediaMySQL "github.com/travelnest/services/media/internal/mysql"
	mediaStorage "github.com/travelnest/services/media/internal/storage"
)

func main() {
	if err := godotenv.Load(); err != nil {
		slog.Info("No .env file found, using system environment/defaults")
	}

	cfg := config.Load()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: logLevel(cfg.LogLevel)}))

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	db, err := mediaMySQL.Connect(ctx, cfg.MySQLDSN)
	if err != nil {
		logger.Error("failed to connect to MySQL", "error", err)
		os.Exit(1)
	}
	defer db.Close()
	repo := mediaMySQL.NewRepository(db)

	storageClient, err := mediaStorage.NewClient(
		cfg.MinIOEndpoint,
		cfg.MinIOAccessKey,
		cfg.MinIOSecretKey,
		cfg.MinIOBucket,
		cfg.PublicObjectBaseURL,
		cfg.MinIOUseSSL,
	)
	if err != nil {
		logger.Error("failed to configure MinIO", "error", err)
		os.Exit(1)
	}
	if err := storageClient.EnsureBucket(ctx); err != nil {
		logger.Error("failed to ensure MinIO bucket", "bucket", cfg.MinIOBucket, "error", err)
		os.Exit(1)
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
	if err := mediaEvents.EnsureStream(js, cfg.NATSStream); err != nil {
		logger.Error("failed to ensure JetStream stream", "stream", cfg.NATSStream, "error", err)
		os.Exit(1)
	}
	if err := mediaEvents.NewConsumer(js, cfg.NATSStream, repo, storageClient, logger).Start(ctx); err != nil {
		logger.Error("failed to start media consumer", "error", err)
		os.Exit(1)
	}

	server := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           mediaHTTP.NewServer(repo, storageClient, mediaEvents.NewPublisher(js), cfg.MaxUploadBytes, logger),
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		logger.Info("media service listening", "addr", cfg.HTTPAddr)
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
