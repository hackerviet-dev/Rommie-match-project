# RoomieMatch chat-service

Go satellite service for realtime chat over WebSockets.

## Local run

```bash
export CHAT_DATABASE_URL="postgres://roomiematch:roomiematch_dev@localhost:5432/roomiematch?sslmode=disable"
go mod tidy
go run .
```

Default endpoint:

- Health: `GET http://localhost:8081/health`
- WebSocket: `ws://localhost:8081/ws`

Messages are persisted to PostgreSQL before they are broadcast. Send JSON in
the following shape:

```json
{
  "conversationId": "30000000-0000-0000-0000-000000000001",
  "senderId": "00000000-0000-0000-0000-000000000001",
  "content": "Chào bạn!"
}
```
