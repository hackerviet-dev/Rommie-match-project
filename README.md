# RoomieMatch Monorepo

RoomieMatch is organized as a monorepo with:

- `backend/src`: .NET modular monolith API, including chat (REST + SignalR).
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
- `GET /api/rooms/health`

Authentication (JWT bearer, HS256):

- `POST /api/auth/register` -> `{ accessToken, tokenType, expiresAt, user }`
- `POST /api/auth/login` -> same session payload
- `GET /api/auth/me` (requires `Authorization: Bearer <token>`)

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"ban@truonghoc.edu.vn","password":"matkhau12345","displayName":"Nguyen Van A","city":"TP.HCM","district":"Quan 1"}'
```

`register` creates the `users` and `profiles` rows in one transaction. Seeded
accounts have no password and therefore cannot log in; create a new account
instead.

Profile and lifestyle preferences (all `me/*` routes require a bearer token):

- `GET /api/users/me/profile` / `PUT /api/users/me/profile`
- `GET /api/users/me/lifestyle` / `PUT /api/users/me/lifestyle`
- `GET /api/users/{userId}/profile` (another member's profile)

`PUT` replaces the whole resource: fields omitted from the body are cleared.
`PUT me/lifestyle` upserts, so it both creates and updates the row.
`profile_completion` is recalculated on every profile write.

No endpoint returns another member's email address; callers read their own from
`GET /api/auth/me`.

Matching:

- `POST /api/matching/me/recalculate` (bearer token) scores the caller against every
  other active member and upserts `matching_scores`.

The compatibility score is a weighted average of eight dimensions, all stored in
the `breakdown` column:

| Key | Weight | Basis |
| --- | --- | --- |
| `sleep` | 16 | Bedtime and wake time distance, wrapping around midnight |
| `cleanliness` | 16 | Difference on the 1-5 scale |
| `budget` | 16 | Overlap of the two budget ranges, relative to the narrower one |
| `location` | 20 | Same district 100, same city 80, different city 0 |
| `social` | 12 | Introvert / balanced / extrovert pairing |
| `lifestyle` | 8 | Smoking (weighted heavier) and pet tolerance |
| `interests` | 6 | Shared interests over the shorter list |
| `timing` | 6 | Distance between move-in dates |

Location is a scoring dimension rather than a filter, so members in other cities
still appear, ranked down by at most 20 points rather than hidden. A candidate
who matches perfectly on everything else scores exactly `100 - location weight`,
so that weight is the single knob for how much distance should cost.

Every dimension is symmetric, so each run writes both directions of every pair
and keeps the candidate's list fresh too. Re-running is idempotent. A caller who
has not saved lifestyle preferences gets `409`.

Room listings:

- `GET /api/rooms` (public) with optional `city`, `district`, `maxRent`, `availableBy`
- `GET /api/rooms/{roomId}` (public)
- `GET /api/rooms/me` (bearer token) including the caller's unlisted rooms
- `POST /api/rooms` / `PUT /api/rooms/{roomId}` / `DELETE /api/rooms/{roomId}` (bearer token)

The owner is taken from the token, never from the body. Writes to somebody
else's listing return `403`, and a missing listing returns `404`. Like the
profile endpoints, `PUT` replaces the whole resource, so fields omitted from the
body are cleared.

Rooms have two independent states, because hiding a listing and deleting it are
different intents:

| State | Column | In public search | In `GET /api/rooms/me` | Reversible |
| --- | --- | --- | --- | --- |
| Listed | — | yes | yes | — |
| Unlisted (`PUT isActive: false`) | `is_active` | no | yes | yes, `PUT` it back |
| Deleted (`DELETE`) | `deleted_at` | no | no | only in the database |

`DELETE` is a soft delete: it stamps `deleted_at` and the row stays in the
database. Afterwards the listing behaves as if it were gone — `GET`, `PUT` and a
second `DELETE` all return `404`.

Local services directory:

- `GET /api/hyperlocal/services?city=...&district=...` (public)
- `GET /api/hyperlocal/services/{serviceId}` (public)
- `POST` / `PUT` / `DELETE /api/hyperlocal/services/{serviceId}` — `admin` or
  `moderator` role required

Unlike rooms, this directory has no per-row owner: it is staff-curated data, so
writes are gated on the `role` claim in the token rather than on ownership. A
member's token gets `403`, no token gets `401`. `DELETE` is a soft delete via
`deleted_at`, same as rooms.

Roles live in `users.role` and are not settable through the API. Promote the
first curator directly in the database, then have them sign in again — the role
is baked into the token when it is issued:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

PostgreSQL-backed sample endpoints:

- `GET /api/users/profiles`
- `GET /api/matching/matches`
- `GET /api/matching/matches?userId=<uuid>`
- `GET /api/hyperlocal/services?city=TP.HCM`
- `GET /api/hyperlocal/services?city=TP.HCM&district=Quận%201`

## Chat

Chat is part of the .NET API: history and sending over REST at `/api/chat`, realtime
events over SignalR at `/hubs/chat`. Clients pass the access token as
`?access_token=` (the SignalR client's `accessTokenFactory` does this). Events go only
to the members of the conversation. See `docs/backend-api-summary.md`.

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

The repository includes PostgreSQL 17, the .NET API (chat included), and the Vite
web app behind nginx.

```bash
cp .env.example .env
docker compose up --build
```

Services are available at:

- Web: `http://localhost:3100`
- .NET API: `http://localhost:5000`
- Chat hub (SignalR): `http://localhost:5000/hubs/chat` or `http://localhost:3100/hubs/chat`
- PostgreSQL: `localhost:55432`

The scripts in `database/init` create the schema and Vietnamese demo data the
first time the PostgreSQL volume is created. Later schema changes in
`database/migrations` run automatically before the API starts, including when
an existing Docker volume is reused. Use the normal startup command to apply
them without deleting data:

```bash
docker compose up -d --build
```

To re-run initialization from a clean database, remove the Compose volume and
start again:

```bash
docker compose down --volumes
docker compose up --build
```

`docker compose down --volumes` deletes the local development database. Do not
run it when the volume contains data you need to keep.

The seeded demo user id is `00000000-0000-0000-0000-000000000001`; its seeded
conversations are `30000000-0000-0000-0000-000000000001` and `...0002`.

The credentials in `.env.example` are for local development only. Replace all
passwords and `JWT_SECRET` before deploying outside a developer machine.
`JWT_SECRET` signs the API's access tokens and must be at least
32 bytes; the API refuses to start otherwise.

## Backend regression tests

`dotnet test` currently has nothing to run: the solution holds no test project, so the release
build (`dotnet build backend/src/RoomieMatch.slnx --configuration Release`) is the only .NET gate
in CI. Behaviour is covered by scripts that need a running API plus PostgreSQL (the Docker stack
from `docker compose up -d`); CI does not run them:

| Script | What it proves |
| --- | --- |
| `node scripts/openapi-contract-check.mjs http://localhost:5000` | every documented operation answers a documented HTTP status, and 200 payloads stay inside the OpenAPI schemas |
| `node scripts/auth-smoke.mjs` | register/login/me, single-flight refresh, logout, logout-all through the bundled web client |
| `node scripts/onboarding-api-test.mjs http://localhost:5000` | profile + lifestyle round-trip, validation and per-account isolation |
| `node scripts/housing-needs-api-test.mjs http://localhost:5000` | housing-needs round-trip, transitions and privacy |
| `node scripts/quiz-api-test.mjs http://localhost:5000` | quiz contract, traits and retakes |
| `node scripts/matching-flow-api-test.mjs http://localhost:5000` | profile -> lifestyle -> quiz -> matching flow and scan quota |
| `node scripts/hyperlocal-services-api-test.mjs http://localhost:5000` | curated services CRUD, staff-only writes and soft delete |
| `node scripts/admin-moderation-api-test.mjs http://localhost:5000` | admin stats vs the DB, report/verification review happy path + validation, role gating and staff-only service CRUD |
| `node scripts/onboarding-validation-test.mjs` | onboarding form schema (no API needed) |
| `python scripts/test-openapi-docs.py http://localhost:5000` | Swagger summaries, descriptions and documented status codes |

`openapi-contract-check.mjs`, `hyperlocal-services-api-test.mjs` and
`admin-moderation-api-test.mjs` promote a probe account to `admin`/`moderator` with `psql` inside the
local PostgreSQL container (override the container with `POSTGRES_CONTAINER`, default
`roomiematch-postgres-1`). The admin moderation script also seeds its report and verification fixtures
straight into `user_reports`/`identity_verifications`, because there is still no member-facing API to
file a report or submit a verification. `POST /api/auth/register`,
`POST /api/auth/login` and `POST /api/auth/refresh` allow 10 requests per 60s per IP, so leave a
minute between the scripts that create accounts or they stop on a documented `429` with
`Retry-After: 60`.

Not covered yet: room CRUD happy paths, chat REST + SignalR realtime, payOS checkout/refund, and the
matching boost happy path. They need seeded rows, a Premium plan or a payment provider that the local
stack does not have, so today only their documented error statuses are exercised. The admin review
happy path (204) is now covered by `admin-moderation-api-test.mjs`, which seeds the review queues.

## CI/CD

GitHub Actions validates every pull request and every relevant push to `main`:

- `.NET API`: restore, release build, and tests.
- `Web app`: deterministic install, lint, and production build.
- `Mobile app`: deterministic install and TypeScript typecheck.
- `Docker`: Compose validation and image builds for web and API.

After the frontend workflow succeeds on `main`, the web build is deployed to
GitHub Pages. In the repository settings, select **Settings → Pages → Source:
GitHub Actions** once to enable the target environment.

Pushing a version tag such as `v1.0.0` creates a GitHub Release containing the
web bundle and the Linux x64 .NET API publish output. A manually dispatched release workflow builds the same artifacts but
does not publish a GitHub Release.
