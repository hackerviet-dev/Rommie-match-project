package repository

import "context"

import "github.com/jackc/pgx/v5/pgxpool"

type Message struct {
	RoomID   string
	SenderID string
	Content  string
}

type MessageRepository interface {
	Save(ctx context.Context, message Message) error
}

type PostgresMessageRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresMessageRepository(pool *pgxpool.Pool) *PostgresMessageRepository {
	return &PostgresMessageRepository{pool: pool}
}

func (repository *PostgresMessageRepository) Save(ctx context.Context, message Message) error {
	const query = `
		INSERT INTO messages (conversation_id, sender_id, content)
		VALUES ($1::uuid, $2::uuid, $3)
	`

	_, err := repository.pool.Exec(ctx, query, message.RoomID, message.SenderID, message.Content)
	return err
}
