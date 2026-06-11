package repository

import "context"

type Message struct {
	RoomID   string
	SenderID string
	Content  string
}

type MessageRepository interface {
	Save(ctx context.Context, message Message) error
}
