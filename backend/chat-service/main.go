package main

import (
	"log"
	"net/http"

	"github.com/roomiematch/chat-service/config"
	"github.com/roomiematch/chat-service/internal/websocket"
)

func main() {
	cfg := config.Load()
	hub := websocket.NewHub()

	go hub.Run()

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"service":"roomiematch-chat","status":"ready"}`))
	})
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		websocket.Serve(hub, w, r)
	})

	log.Printf("chat-service listening on %s", cfg.ListenAddress)
	log.Fatal(http.ListenAndServe(cfg.ListenAddress, nil))
}
