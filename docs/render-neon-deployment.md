# RoomieMatch on Render + Neon

The active deployment option is Render for the .NET API, Neon for PostgreSQL,
and Vercel for the existing frontend. Railway configuration is an unused alternative.

## Neon

Create a Free project named `RoomieMatch` in AWS Singapore and use PostgreSQL 17.
Create a database named `roomiematch`. Use the project's connection dialog to
obtain the hostname, database, role and password. Configure a native Npgsql
connection string on Render (a `postgresql://` URL is not an Npgsql connection string):

```text
Host=<neon-host>;Port=5432;Database=roomiematch;Username=<neon-role>;Password=<password>;SSL Mode=VerifyFull;Maximum Pool Size=10;Connection Idle Lifetime=60;Timeout=30
```

A pooled Neon hostname is supported: migrations use transaction-level advisory
locks rather than session locks. Store the connection string only in Render's
`ConnectionStrings__Postgres` secret variable; do not commit it or place it in Vercel.

## Render

Create a Blueprint from `hackerviet-dev/Rommie-match-project`, branch `Bao-Branch`,
using the root `render.yaml`. The Blueprint provisions only a Free Docker API;
PostgreSQL is hosted by Neon. Render generates the JWT secret and asks for the Neon
connection string. Keep the repository root as build context, because the Dockerfile
copies both `backend/src` and `database/init`.

Free Render does not provide a pre-deploy command. `Database__MigrateOnStartup=true`
therefore runs the existing SQL migrations before the HTTP server starts. Migrations
are transactional, serialized, and recorded in `roomiematch_schema_migrations`.
Repeated starts skip previously applied migrations. `002_seed.sql` is excluded from
the published image, so no demo accounts are created.

## Vercel and payOS

Once the Render service has a public HTTPS URL:

1. Set `VITE_API_BASE_URL=https://<actual-api-domain>` on the Vercel project and redeploy.
2. Set `Billing__PublicApiBaseUrl=https://<actual-api-domain>` on Render.
3. Set `Billing__PayOs__ClientId`, `Billing__PayOs__ApiKey` and
   `Billing__PayOs__ChecksumKey` as Render secrets, then set `Billing__Provider=payos`.
   Update/remove the empty provider value in the Blueprint before another sync.
4. Register `https://<actual-api-domain>/api/billing/payos/webhook` with payOS.
5. Verify `/health`, `/api/billing/plans`, registration/login from Vercel, and a
   signed payment callback. A browser return URL must never confirm a payment.

Keep payment keys only on the backend. If keys were exposed, replace them before
activating the merchant integration.

## Limits and verification

Render Free sleeps after 15 idle minutes and can take about a minute to wake up.
Use it for development/demo; upgrade the API compute plan for live payment callbacks.
Neon Free also has storage and compute quotas; monitor both dashboards.

Run `pwsh -File scripts/test-railway.ps1` to verify the shared production Docker image,
migrations, health endpoint and CORS against an isolated local PostgreSQL instance.
Despite its original filename, this check also exercises the Render startup migration path.

References: [Render Free](https://render.com/docs/free),
[Render deploy commands](https://render.com/docs/deploys),
[Blueprint fields](https://render.com/docs/blueprint-spec),
[Neon pricing](https://neon.com/pricing).
