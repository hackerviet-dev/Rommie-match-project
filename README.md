# RoomieMatch Monorepo

RoomieMatch is organized as a monorepo with:

- `backend/src`: .NET modular monolith API.
- `backend/chat-service`: Go WebSocket chat service.
- `frontend/web-app`: React + Vite dashboard for landlords.
- `frontend/mobile-app`: React Native student mobile app.

## Backend

```bash
dotnet build backend/src/RoomieMatch.slnx
dotnet run --project backend/src/RoomieMatch.Bootstrapper
```

Health endpoints:

- `GET /`
- `GET /api/auth/health`
- `GET /api/matching/health`
- `GET /api/hyperlocal/health`

## Chat service

```bash
cd backend/chat-service
go mod tidy
go run .
```

## Web app

```bash
cd frontend/web-app
npm install
npm run dev
```

## Mobile app

```bash
cd frontend/mobile-app
npm install
npm run start
```
