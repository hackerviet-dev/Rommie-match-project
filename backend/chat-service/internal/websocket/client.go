package websocket

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	gorilla "github.com/gorilla/websocket"
	"github.com/roomiematch/chat-service/internal/repository"
)

const (
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = (pongWait * 9) / 10
)

var upgrader = gorilla.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Client struct {
	hub  *Hub
	conn *gorilla.Conn
	send chan []byte
}

type incomingMessage struct {
	ConversationID string `json:"conversationId"`
	SenderID       string `json:"senderId"`
	Content        string `json:"content"`
}

func Serve(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	client := &Client{hub: hub, conn: conn, send: make(chan []byte, 256)}
	client.hub.register <- client

	go client.writePump()
	go client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		_ = c.conn.Close()
	}()

	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			break
		}

		var payload incomingMessage
		if err := json.Unmarshal(message, &payload); err != nil {
			log.Printf("ignoring non-JSON chat message: %v", err)
			continue
		}

		payload.Content = strings.TrimSpace(payload.Content)
		if payload.ConversationID == "" || payload.SenderID == "" || payload.Content == "" {
			log.Print("ignoring chat message with missing conversationId, senderId, or content")
			continue
		}

		if err := c.hub.repository.Save(context.Background(), repository.Message{
			RoomID:   payload.ConversationID,
			SenderID: payload.SenderID,
			Content:  payload.Content,
		}); err != nil {
			log.Printf("failed to persist chat message: %v", err)
			continue
		}
		c.hub.broadcast <- message
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(gorilla.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(gorilla.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(gorilla.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
