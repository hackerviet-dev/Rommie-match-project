# RoomieMatch chat-service

Go satellite service for realtime chat over WebSockets.

## Local run

```bash
go mod tidy
go run .
```

Default endpoint:

- Health: `GET http://localhost:8081/health`
- WebSocket: `ws://localhost:8081/ws`
