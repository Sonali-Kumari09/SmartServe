# Smart Meal Backend

Express REST API for meal demand forecasting, inventory safety tracking, and surplus redistribution. The persistence layer now uses PostgreSQL through the `pg` driver. The route paths and frontend JSON contracts remain stable so the Vanilla JS client can continue using JWTs in `Authorization` headers.

## Requirements

- Node.js 18 or newer
- PostgreSQL 14 or newer
- npm

## Install PostgreSQL on Windows

Check whether it is already installed:

```powershell
Get-Command psql, postgres, pg_ctl -ErrorAction SilentlyContinue
Get-Service | Where-Object { $_.Name -match 'postgres' -or $_.DisplayName -match 'postgres' }
```

If PostgreSQL is missing and `winget` is available:

```powershell
winget install --id PostgreSQL.PostgreSQL.17 -e --accept-source-agreements --accept-package-agreements
```

Restart the terminal after installation. Start the PostgreSQL service from Windows Services, or use the service name installed on your machine.

## Configure the Database

From `backend/`, copy `.env.example` to `.env` and set the PostgreSQL password:

```powershell
Copy-Item .env.example .env
```

The default local settings are:

```text
PGHOST=127.0.0.1
PGPORT=5432
PGDATABASE=smart_meal
PGUSER=postgres
PGPASSWORD=your-postgres-password
PGSSL=false
```

Create the database if it does not already exist:

```powershell
psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE smart_meal;"
```

Initialize the schema and demo data:

```powershell
psql -U postgres -h 127.0.0.1 -d smart_meal -f database/schema.sql
psql -U postgres -h 127.0.0.1 -d smart_meal -f database/seed.sql
```

The server also checks the database connection at startup. Keep `ALLOW_PRIVILEGED_REGISTRATION=false` in production. Public registration creates students by default.

## Install and Run

```powershell
cd backend
npm.cmd install
npm.cmd run dev
```

Production-style startup:

```powershell
npm.cmd start
```

The API runs at `http://localhost:5000`. With PostgreSQL online, the health endpoint returns database status:

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

## Test

Run the dependency-free smoke tests:

```powershell
npm.cmd test
```

These tests load the Express app and test health/404 behavior. They pass whether PostgreSQL is online or offline; the health response reports `ok` when connected and `degraded` with HTTP `503` when unavailable.

Run a full PostgreSQL-backed demo after the schema is initialized and the server is running:

```powershell
$register = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/auth/register -ContentType 'application/json' -Body (@{
  name = 'Demo Student'
  email = "student-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())@example.com"
  password = 'password123'
} | ConvertTo-Json)
```

For local-only admin testing, temporarily set `ALLOW_PRIVILEGED_REGISTRATION=true` in `.env`, restart the server, and register an admin:

```powershell
$admin = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/auth/register -ContentType 'application/json' -Body (@{
  name = 'Demo Admin'
  email = "admin-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())@example.com"
  password = 'password123'
  role = 'admin'
} | ConvertTo-Json)
$headers = @{ Authorization = "Bearer $($admin.token)" }
```

Create menu, inventory, surplus, and recipient records:

```powershell
$menu = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/forecast/menus -Headers $headers -ContentType 'application/json' -Body (@{
  date = '2026-08-22'
  mealType = 'lunch'
  baselineAttendance = 650
  items = @(@{ name = 'Rice bowl'; category = 'Main'; portionsPlanned = 650 })
} | ConvertTo-Json -Depth 5)

$inventory = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/inventory -Headers $headers -ContentType 'application/json' -Body (@{
  foodItem = 'Rice bowl'
  quantityKg = 40
  currentTempF = 70
  location = 'Kitchen Station A'
} | ConvertTo-Json)

$surplus = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/surplus -Headers $headers -ContentType 'application/json' -Body (@{
  inventoryRef = $inventory.item._id
  quantityKg = 20
} | ConvertTo-Json)

$recipient = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/surplus/recipients -Headers $headers -ContentType 'application/json' -Body (@{
  name = 'Community Food Center'
  contactPerson = 'Demo Contact'
  city = 'Springfield'
  capacityKg = 100
} | ConvertTo-Json)

Invoke-RestMethod -Method Patch -Uri "http://localhost:5000/api/surplus/$($surplus.batch._id)/match" -Headers $headers -ContentType 'application/json' -Body (@{
  recipientId = $recipient.recipient._id
} | ConvertTo-Json)

Invoke-RestMethod -Method Get -Uri 'http://localhost:5000/api/forecast?mealType=lunch' -Headers $headers
Invoke-RestMethod -Method Get -Uri http://localhost:5000/api/reports/summary -Headers $headers
```

## API Routes

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/students/menus`, `GET /api/students/profile`
- `GET /api/forecast`, menu CRUD under `/api/forecast/menus`
- Inventory CRUD under `/api/inventory`
- Surplus and recipient operations under `/api/surplus`
- `GET /api/reports/summary`

Protected routes require:

```text
Authorization: Bearer <jwt-token>
```

## PostgreSQL Integration Boundary

All SQL access is centralized in `config/database.js` and the query modules under `models/`. A future move to a managed PostgreSQL instance only requires changing the environment connection settings, while the frontend API contract remains unchanged.

## Production Checklist

- Use a managed PostgreSQL deployment with TLS and restricted network access.
- Set a unique high-entropy `JWT_SECRET`.
- Set exact trusted frontend origins in `FRONTEND_ORIGIN`.
- Keep `.env` out of source control; it is ignored by `.gitignore`.
- Disable privileged public registration.
- Run `npm.cmd audit` before deployment.
