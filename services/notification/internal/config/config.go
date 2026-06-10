package config

import (
	"os"
	"strings"
)

type Config struct {
	HTTPAddr             string
	MySQLDSN             string
	NATSURL              string
	NATSStream           string
	SMTPHost             string
	SMTPPort             string
	SMTPSecure           bool
	SMTPUser             string
	SMTPPass             string
	SMTPSkipVerify       bool
	DefaultFromEmail     string
	ClientHost           string
	InternalServiceToken string
	LogLevel             string
}

func Load() Config {
	return Config{
		HTTPAddr:             getenv("HTTP_ADDR", ":8083"),
		MySQLDSN:             getenv("MYSQL_DSN", "user:123@tcp(mysql:3306)/travelnest?parseTime=true"),
		NATSURL:              getenv("NATS_URL", "nats://nats:4222"),
		NATSStream:           getenv("NATS_STREAM", "TRAVELNEST_EVENTS"),
		SMTPHost:             os.Getenv("SMTP_HOST"),
		SMTPPort:             getenv("SMTP_PORT", "587"),
		SMTPSecure:           getenvBool("SMTP_SECURE", false),
		SMTPUser:             os.Getenv("SMTP_USER"),
		SMTPPass:             os.Getenv("SMTP_PASS"),
		SMTPSkipVerify:       getenvBool("SMTP_SKIP_VERIFY", getenv("NODE_ENV", "") != "production"),
		DefaultFromEmail:     os.Getenv("DEFAULT_FROM_EMAIL"),
		ClientHost:           getenv("CLIENT_HOST", "http://localhost:5173"),
		InternalServiceToken: os.Getenv("INTERNAL_SERVICE_TOKEN"),
		LogLevel:             getenv("LOG_LEVEL", "info"),
	}
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getenvBool(key string, fallback bool) bool {
	value := strings.ToLower(os.Getenv(key))
	switch value {
	case "true", "1", "yes":
		return true
	case "false", "0", "no":
		return false
	default:
		return fallback
	}
}
