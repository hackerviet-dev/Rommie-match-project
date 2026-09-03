# RoomieMatch Monorepo

RoomieMatch is organized as a monorepo with:

- `backend/src`: .NET modular monolith API.
- `backend/chat-service`: Go WebSocket chat service.
- `frontend/web-app/rommie-match`: React + Vite RoomieMatch web app.
- `frontend/mobile-app`: React Native student mobile app.

## Backend

```bash
dotnet build backend/src/RoomieMatch.slnx
dotnet run --project backend/src/RoomieMatch.Bootstrapper
```

Health endpoints:

- `GET /`
- `GET /health` (includes PostgreSQL connectivity)
- `GET /api/auth/health`
- `GET /api/matching/health`
- `GET /api/hyperlocal/health`

PostgreSQL-backed sample endpoints:

- `GET /api/users/profiles`
- `GET /api/matching/matches`
- `GET /api/matching/matches?userId=<uuid>`
- `GET /api/hyperlocal/services?city=TP.HCM`
- `GET /api/hyperlocal/services?city=TP.HCM&district=Quận%201`

## Chat service

```bash
cd backend/chat-service
go mod tidy
go run .
```

## Web app

```bash
cd frontend/web-app/rommie-match
npm ci
npm run dev
```

## Mobile app

```bash
cd frontend/mobile-app
npm ci
npm run start
```

## Docker development stack

The repository includes PostgreSQL 17, the .NET API, the Go WebSocket chat
service, and the Vite web app behind nginx.

```bash
cp .env.example .env
docker compose up --build
```

Services are available at:

- Web: `http://localhost:3000`
- .NET API: `http://localhost:5000`
- Go chat health: `http://localhost:8081/health`
- WebSocket: `ws://localhost:8081/ws` or `ws://localhost:3000/ws`
- PostgreSQL: `localhost:5432`

The scripts in `database/init` create the schema and Vietnamese demo data the
first time the PostgreSQL volume is created. To re-run initialization from a
clean database, remove the Compose volume and start again:

```bash
docker compose down --volumes
docker compose up --build
```

`docker compose down --volumes` deletes the local development database. Do not
run it when the volume contains data you need to keep.

The seeded demo user id used by the matching endpoint is
`00000000-0000-0000-0000-000000000001`. WebSocket messages must use this JSON
shape and reference seeded or real UUIDs:

```json
{
  "conversationId": "30000000-0000-0000-0000-000000000001",
  "senderId": "00000000-0000-0000-0000-000000000001",
  "content": "Chào bạn!"
}
```

The credentials in `.env.example` are for local development only. Replace all
passwords and `CHAT_JWT_SECRET` before deploying outside a developer machine.

## CI/CD

GitHub Actions validates every pull request and every relevant push to `main`:

- `.NET API`: restore, release build, and tests.
- `Go chat service`: formatting, vet, race-enabled tests, and build.
- `Web app`: deterministic install, lint, and production build.
- `Mobile app`: deterministic install and TypeScript typecheck.
- `Docker`: Compose validation and image builds for web, API, and chat.

After the frontend workflow succeeds on `main`, the web build is deployed to
GitHub Pages. In the repository settings, select **Settings → Pages → Source:
GitHub Actions** once to enable the target environment.

Pushing a version tag such as `v1.0.0` creates a GitHub Release containing the
web bundle, the Linux x64 .NET API publish output, and the Linux amd64 Go chat
service. A manually dispatched release workflow builds the same artifacts but
does not publish a GitHub Release.
