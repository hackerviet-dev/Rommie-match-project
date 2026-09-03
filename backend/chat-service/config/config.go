package config

import "os"

type Config struct {
	ListenAddress string
	DatabaseURL   string
	JWTSecret     string
}

func Load() Config {
	return Config{
		ListenAddress: getEnv("CHAT_LISTEN_ADDRESS", ":8081"),
		DatabaseURL:   getEnv("CHAT_DATABASE_URL", "postgres://roomiematch:roomiematch_dev@localhost:5432/roomiematch?sslmode=disable"),
		JWTSecret:     getEnv("CHAT_JWT_SECRET", "dev-secret-change-me"),
	}
}

func getEnv(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	return value
}
