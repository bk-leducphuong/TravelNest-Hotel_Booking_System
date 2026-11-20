package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	HTTPAddr                string
	NATSURL                 string
	NATSStream              string
	MySQLDSN                string
	RedisURL                string
	TrendingHotelsCacheTTL  time.Duration
	TrendingDestinationsTTL time.Duration
	SearchRetentionDays     int
	ViewRetentionDays       int
	PurgeInterval           time.Duration
	PurgeBatchSize          int
	LogLevel                string
}

func Load() Config {
	return Config{
		HTTPAddr:                getenv("HTTP_ADDR", ":8081"),
		NATSURL:                 getenv("NATS_URL", "nats://nats:4222"),
		NATSStream:              getenv("NATS_STREAM", "TRAVELNEST_ANALYTICS"),
		MySQLDSN:                getenv("MYSQL_DSN", "travelnest:travelnest@tcp(mysql:3306)/travelnest?parseTime=true&loc=UTC"),
		RedisURL:                getenv("REDIS_URL", "redis://redis:6379/1"),
		TrendingHotelsCacheTTL:  getenvDuration("TRENDING_HOTELS_CACHE_TTL", 2*time.Minute),
		TrendingDestinationsTTL: getenvDuration("TRENDING_DESTINATIONS_CACHE_TTL", 5*time.Minute),
		SearchRetentionDays:     getenvInt("ANALYTICS_SEARCH_RETENTION_DAYS", 730),
		ViewRetentionDays:       getenvInt("ANALYTICS_VIEW_RETENTION_DAYS", 90),
		PurgeInterval:           getenvDuration("ANALYTICS_PURGE_INTERVAL", time.Hour),
		PurgeBatchSize:          getenvInt("ANALYTICS_PURGE_BATCH_SIZE", 5000),
		LogLevel:                getenv("LOG_LEVEL", "info"),
	}
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getenvDuration(key string, fallback time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	duration, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}
	return duration
}

func getenvInt(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}
