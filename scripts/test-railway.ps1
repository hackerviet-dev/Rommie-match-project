param([switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location (Split-Path $PSScriptRoot -Parent)

function Invoke-Docker {
    $result = & docker @args
    if ($LASTEXITCODE -ne 0) { throw "Docker command failed: $($args[0])" }
    return $result
}

$suffix = [Guid]::NewGuid().ToString('N').Substring(0, 12)
$network = "roomiematch-check-$suffix"
$postgres = "roomiematch-check-pg-$suffix"
$api = "roomiematch-check-api-$suffix"
$password = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$connection = "Host=$postgres;Port=5432;Database=roomiematch_check;Username=postgres;Password=$password"
$image = 'roomiematch-railway-check:local'

try {
    if (-not $SkipBuild) {
        Invoke-Docker build -f backend/src/RoomieMatch.Bootstrapper/Dockerfile -t $image . | Out-Host
    }
    Invoke-Docker network create $network | Out-Null
    Invoke-Docker run -d --rm --name $postgres --network $network -e "POSTGRES_PASSWORD=$password" -e POSTGRES_DB=roomiematch_check postgres:17-alpine | Out-Null
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        & docker exec $postgres pg_isready -U postgres -d roomiematch_check 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) { throw 'Test PostgreSQL did not become ready.' }

    Invoke-Docker run --rm --network $network -e "ConnectionStrings__Postgres=$connection" $image --migrate | Out-Host
    $first = Invoke-Docker exec $postgres psql -U postgres -d roomiematch_check -Atc "SELECT string_agg(name || ':' || applied_at::text, ',' ORDER BY name) FROM roomiematch_schema_migrations"
    Invoke-Docker run --rm --network $network -e "ConnectionStrings__Postgres=$connection" $image --migrate | Out-Host
    $second = Invoke-Docker exec $postgres psql -U postgres -d roomiematch_check -Atc "SELECT string_agg(name || ':' || applied_at::text, ',' ORDER BY name) FROM roomiematch_schema_migrations"
    if ($first -ne $second) { throw 'Migration rerun modified the migration ledger.' }
    $counts = Invoke-Docker exec $postgres psql -U postgres -d roomiematch_check -Atc "SELECT (SELECT count(*) FROM roomiematch_schema_migrations), (SELECT count(*) FROM users), to_regclass('payments_provider_order_code_seq') IS NOT NULL"
    if ($counts -ne '10|0|t') { throw "Unexpected schema/demo data state: $counts" }

    Invoke-Docker run -d --rm --name $api --network $network -p '127.0.0.1::8080' -e ASPNETCORE_ENVIRONMENT=Production -e Database__MigrateOnStartup=true -e "ConnectionStrings__Postgres=$connection" -e "Jwt__Secret=$password" -e Cors__AllowedOrigins__0=https://roomate-1.vercel.app $image | Out-Null
    $port = (Invoke-Docker port $api 8080/tcp) -replace '^127\.0\.0\.1:', ''
    $baseUrl = "http://127.0.0.1:$port"
    $healthy = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        try {
            $health = Invoke-WebRequest "$baseUrl/health" -UseBasicParsing
            if ($health.StatusCode -eq 200 -and $health.Content -eq 'Healthy') { $healthy = $true; break }
        } catch { Start-Sleep -Seconds 1 }
    }
    if (-not $healthy) { throw 'Production API did not become healthy.' }
    $plans = Invoke-RestMethod "$baseUrl/api/billing/plans"
    if ($plans.Count -lt 2) { throw 'Billing plans endpoint did not return plans.' }
    $cors = Invoke-WebRequest "$baseUrl/api/billing/plans" -UseBasicParsing -Method Options -Headers @{ Origin='https://roomate-1.vercel.app'; 'Access-Control-Request-Method'='GET' }
    if ($cors.Headers['Access-Control-Allow-Origin'] -ne 'https://roomate-1.vercel.app') { throw 'Vercel origin was not allowed by CORS.' }
    Write-Host 'PASS: production image, 10 migrations, safe rerun, no demo users, health, plans, Vercel CORS.'
} finally {
    # Only containers and the network created by this test are removed. No volumes are used.
    & docker rm -f $api $postgres 2>$null | Out-Null
    & docker network rm $network 2>$null | Out-Null
}
