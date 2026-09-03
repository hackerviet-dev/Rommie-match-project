package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/roomiematch/chat-service/config"
	"github.com/roomiematch/chat-service/internal/repository"
	"github.com/roomiematch/chat-service/internal/websocket"
)

func main() {
	cfg := config.Load()
	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("create PostgreSQL pool: %v", err)
	}
	defer pool.Close()

	startupContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := pool.Ping(startupContext); err != nil {
		log.Fatalf("connect to PostgreSQL: %v", err)
	}

	messageRepository := repository.NewPostgresMessageRepository(pool)
	hub := websocket.NewHub(messageRepository)

	go hub.Run()

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if err := pool.Ping(r.Context()); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte(`{"service":"roomiematch-chat","status":"degraded","database":"unavailable"}`))
			return
		}
		_, _ = w.Write([]byte(`{"service":"roomiematch-chat","status":"ready","database":"connected"}`))
	})
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		websocket.Serve(hub, w, r)
	})

	log.Printf("chat-service listening on %s", cfg.ListenAddress)
	log.Fatal(http.ListenAndServe(cfg.ListenAddress, nil))
}
