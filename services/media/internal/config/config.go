package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	HTTPAddr            string
	MySQLDSN            string
	MinIOEndpoint       string
	MinIOAccessKey      string
	MinIOSecretKey      string
	MinIOBucket         string
	MinIOUseSSL         bool
	PublicObjectBaseURL string
	NATSURL             string
	NATSStream          string
	LogLevel            string
	MaxUploadBytes      int64
}

func Load() Config {
	return Config{
		HTTPAddr:            getenv("HTTP_ADDR", ":8082"),
		MySQLDSN:            getenv("MYSQL_DSN", "user:123@tcp(mysql:3306)/travelnest?parseTime=true"),
		MinIOEndpoint:       getenv("MINIO_ENDPOINT", "minio:9000"),
		MinIOAccessKey:      getenv("MINIO_ACCESS_KEY", "minioadmin"),
		MinIOSecretKey:      getenv("MINIO_SECRET_KEY", "minioadmin123"),
		MinIOBucket:         getenv("MINIO_BUCKET", "uploads"),
		MinIOUseSSL:         getenvBool("MINIO_USE_SSL", false),
		PublicObjectBaseURL: strings.TrimRight(getenv("PUBLIC_OBJECT_BASE_URL", "http://localhost:9000/uploads"), "/"),
		NATSURL:             getenv("NATS_URL", "nats://nats:4222"),
		NATSStream:          getenv("NATS_STREAM", "TRAVELNEST_MEDIA"),
		LogLevel:            getenv("LOG_LEVEL", "info"),
		MaxUploadBytes:      getenvBytes("MAX_UPLOAD_BYTES", 5*1024*1024),
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

func getenvBytes(key string, fallback int64) int64 {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}
