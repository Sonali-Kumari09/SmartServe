# 🍽️ SmartServe MVP

SmartServe helps campus kitchens **prepare the right amount of food, keep it safe, and redirect surplus to people who need it**.

- 🎓 **Students** can view live meal menus, timings, holidays, mark whether they will attend each meal, and leave per-meal feedback.
- 🧑‍🍳 **Admins** get demand forecasts (calendar, weather, RSVP attendance, historical consumption), recommended preparation quantities, inventory with storage time & temperature, safe surplus matching, and food / cost / carbon savings reports.
- 🛡️ Safety rules prevent redistribution of unsafe batches.

## Project structure

```
SmartServe/
├── index.html              # Landing page (name + tagline + login)
├── login.html              # Student / Admin separate login & registration
├── student/                # Student portal pages
│   └── dashboard.html
├── admin/                  # Admin portal pages
│   ├── dashboard.html      # Forecast, calendar, menus, savings
│   ├── inventory.html      # Storage time & temperature logs
│   ├── surplus.html        # Surplus matching to recipients
│   └── reports.html
├── css/                    # Frontend styles
├── js/                     # Frontend logic (vanilla JS)
│   ├── api.js
│   ├── auth/
│   ├── core/               # forecast, weather, calendar, safety, matching
│   ├── data/
│   ├── pages/
│   └── utils/
├── assets/
├── server.js               # Express API entry (BACKEND)
├── config/                 # DB config (BACKEND)
├── controllers/            # Route handlers (BACKEND)
├── middleware/             # Auth & role guards (BACKEND)
├── models/                 # Data access (BACKEND)
├── routes/                 # API routes (BACKEND)
├── database/
│   ├── schema.sql
│   └── seed.sql
├── package.json
└── .env.example
```

### Frontend vs Backend

| Area | Path | Role |
|------|------|------|
| **Frontend** | `index.html`, `login.html`, `student/`, `admin/`, `css/`, `js/`, `assets/` | Static UI served by Express; talks to `/api/*` |
| **Backend** | `server.js`, `config/`, `controllers/`, `middleware/`, `models/`, `routes/`, `database/` | Express + PostgreSQL API |

## Fix: "Failed to fetch" on login / register

That message means the browser could not reach the API. Almost always one of:

1. **Server is not running** — in the project folder run `npm install` then `npm start`.
2. **Wrong URL** — open **http://localhost:5000** (served by Express). Do **not** open `login.html` via Live Server, VS Code “Open with Live Server”, or double‑clicking the file (`file://`).
3. **PostgreSQL / .env** — copy `.env.example` to `.env`, set `PG*` and `JWT_SECRET`, create the DB, run `schema.sql` and `seed.sql`.

Quick check: visit http://localhost:5000/api/health — you should see JSON (`status: ok` or `degraded`).

Note: `admin@example.com` is already created by the seed. Register a **new** email, or sign in with `admin@example.com` / `password123`.

## Prerequisites
- Node.js 18+ (LTS)
- PostgreSQL 14+ running locally

## Setup
1. Clone and enter project:
   git clone <your-repo-url>
   cd SmartServe

2. Install dependencies:
   npm install

3. Configure environment:
   cp .env.example .env
   # Edit .env — set PGPASSWORD to your Postgres password
   # Keep PGDATABASE=smartserve

4. Create database and load data:
   # Windows (PowerShell / cmd) or Mac/Linux:
   psql -U postgres -c "CREATE DATABASE smartserve;"
   psql -U postgres -d smartserve -f database/schema.sql
   psql -U postgres -d smartserve -f database/seed.sql

5. Start:
   npm start

6. Open: http://localhost:5000
   (Do not use Live Server or open HTML files directly.)

## Demo logins (after seed)
| Role    | Email                 | Password    |
|---------|-----------------------|-------------|
| Admin   | admin@example.com     | password123 |
| Student | student@example.com   | password123 |

## Health check
http://localhost:5000/api/health  → should show "status":"ok"

Register new **student** or **admin** accounts from the login page (role tabs). Student accounts cannot sign in on the Admin portal and vice versa.

Seed also inserts **dummy menus for the next 14 days** so student and admin dashboards show meals out of the box. Re-run `seed.sql` after schema changes if menus are missing.

### Attendance → meal forecast

Students mark “I will have this meal” on the student dashboard. Those RSVPs are stored in `meal_attendance` and the admin **demand forecast** blends them with historical baseline attendance to predict how many meals to prepare.

## API overview

- `POST /api/auth/register` — body: `{ email, password, role: "student"|"admin" }`
- `POST /api/auth/login` — body: `{ email, password, role? }` (role enforces portal separation)
- `GET/POST /api/students/attendance` — student meal RSVP
- `GET/POST /api/students/feedback` — student meal ratings
- `GET /api/forecast` — demand forecast + recommended kg
- Inventory, surplus matching, and reports under `/api/inventory`, `/api/surplus`, `/api/reports`

## License

MVP educational project.
