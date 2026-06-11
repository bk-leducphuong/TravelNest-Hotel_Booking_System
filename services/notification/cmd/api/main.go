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
	"github.com/travelnest/services/notification/internal/config"
	notificationEmail "github.com/travelnest/services/notification/internal/email"
	notificationEvents "github.com/travelnest/services/notification/internal/events"
	notificationHTTP "github.com/travelnest/services/notification/internal/http"
	notificationMySQL "github.com/travelnest/services/notification/internal/mysql"
)

func main() {
	if err := godotenv.Load(); err != nil {
		slog.Info("No .env file found, using system environment/defaults")
	}

	cfg := config.Load()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: logLevel(cfg.LogLevel)}))

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	db, err := notificationMySQL.Connect(ctx, cfg.MySQLDSN)
	if err != nil {
		logger.Error("failed to connect to MySQL", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	repo := notificationMySQL.NewRepository(db)
	mailer := notificationEmail.NewMailer(notificationEmail.Config{
		Host:             cfg.SMTPHost,
		Port:             cfg.SMTPPort,
		Secure:           cfg.SMTPSecure,
		Username:         cfg.SMTPUser,
		Password:         cfg.SMTPPass,
		SkipVerify:       cfg.SMTPSkipVerify,
		DefaultFromEmail: cfg.DefaultFromEmail,
		ClientHost:       cfg.ClientHost,
		Logger:           logger,
	})

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
	if err := notificationEvents.EnsureStream(js, cfg.NATSStream); err != nil {
		logger.Error("failed to ensure JetStream stream", "stream", cfg.NATSStream, "error", err)
		os.Exit(1)
	}
	if err := notificationEvents.NewConsumer(js, cfg.NATSStream, mailer, repo, logger).Start(ctx); err != nil {
		logger.Error("failed to start notification consumers", "error", err)
		os.Exit(1)
	}

	server := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           notificationHTTP.NewServer(repo, cfg.InternalServiceToken, logger),
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		logger.Info("notification service listening", "addr", cfg.HTTPAddr)
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
