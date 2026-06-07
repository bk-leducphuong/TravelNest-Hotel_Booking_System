package config

import (
	"os"
	"time"
)

type Config struct {
	HTTPAddr                string
	NATSURL                 string
	NATSStream              string
	MongoDBURI              string
	MongoDBDatabase         string
	RedisURL                string
	TrendingHotelsCacheTTL  time.Duration
	TrendingDestinationsTTL time.Duration
	LogLevel                string
}

func Load() Config {
	return Config{
		HTTPAddr:                getenv("HTTP_ADDR", ":8081"),
		NATSURL:                 getenv("NATS_URL", "nats://nats:4222"),
		NATSStream:              getenv("NATS_STREAM", "TRAVELNEST_ANALYTICS"),
		MongoDBURI:              getenv("MONGODB_URI", "mongodb://mongodb:27017"),
		MongoDBDatabase:         getenv("MONGODB_DATABASE", "travelnest_analytics"),
		RedisURL:                getenv("REDIS_URL", "redis://redis:6379/1"),
		TrendingHotelsCacheTTL:  getenvDuration("TRENDING_HOTELS_CACHE_TTL", 2*time.Minute),
		TrendingDestinationsTTL: getenvDuration("TRENDING_DESTINATIONS_CACHE_TTL", 5*time.Minute),
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
