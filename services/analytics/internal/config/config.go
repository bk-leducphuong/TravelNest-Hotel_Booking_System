package config

import "os"

type Config struct {
	HTTPAddr        string
	NATSURL         string
	NATSStream      string
	MongoDBURI      string
	MongoDBDatabase string
	LogLevel        string
}

func Load() Config {
	return Config{
		HTTPAddr:        getenv("HTTP_ADDR", ":8081"),
		NATSURL:         getenv("NATS_URL", "nats://nats:4222"),
		NATSStream:      getenv("NATS_STREAM", "TRAVELNEST_ANALYTICS"),
		MongoDBURI:      getenv("MONGODB_URI", "mongodb://mongodb:27017"),
		MongoDBDatabase: getenv("MONGODB_DATABASE", "travelnest_analytics"),
		LogLevel:        getenv("LOG_LEVEL", "info"),
	}
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
