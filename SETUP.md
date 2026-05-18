# Environment Setup Guide

This guide walks you through obtaining the credentials needed to run Project Flowboard.

## 1. Clerk (Authentication)

Project Flowboard uses [Clerk](https://clerk.com/) for user authentication. You need a free Clerk account.

### 1.1 Sign up
- Go to https://clerk.com and create an account.

### 1.2 Create an Application
- In the Clerk Dashboard, click **Create Application**.
- Name it whatever you like (e.g. `Flowboard`).
- Choose your sign-in providers (Email + Password is fine for self-hosting).

### 1.3 Get your API Keys
- Go to **Dashboard → Your App → API Keys**.
- Copy the **Publishable key** — starts with `pk_test_` (development) or `pk_live_` (production).
- Copy the **Secret key** — starts with `sk_test_` (development) or `sk_live_` (production).

### 1.4 Configure Allowed Origins (Important!)
In production, Clerk validates the **Referer** / **Origin** header. You must whitelist your domain:
- Go to **Dashboard → Your App → Customize → Domain and URLs**.
- Add your production URL (e.g. `https://flowboard.yourdomain.com`) to the **Authorized domains** list.
- For local development, `http://localhost:3002` is usually allowed by default.

### 1.5 Fill in your .env files

**`apps/web/.env`**
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxx
VITE_API_URL=http://localhost:4000
```

**`apps/api/.env`**
```
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxx
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=group_app
```

## 2. PostgreSQL (Database)

The easiest way to run Postgres locally is via Docker:

```bash
# From the repo root
$ cd /path/to/project-flowboard
docker-compose up -d
```

This starts a Postgres 15 container with:
- User: `postgres`
- Password: `postgres`
- Database: `group_app`
- Port: `5432`

If you already have Postgres running elsewhere, update the `DB_*` variables in `apps/api/.env` accordingly.

## 3. Run Migrations

After starting Postgres for the first time, create the tables:

```bash
pnpm db:migrate
```

## 4. Start the Application

```bash
pnpm dev
```

- Frontend: http://localhost:3002
- API: http://localhost:4000

## 5. Troubleshooting

| Problem | Likely cause | Fix |
|---------|-------------|-----|
| `Clerk load error` on sign-in page | Missing or invalid `VITE_CLERK_PUBLISHABLE_KEY` | Check the key in `apps/web/.env` |
| `401 Unauthorized` on all API routes | Invalid `CLERK_SECRET_KEY` or mismatched environment (test vs live) | Ensure both keys are from the same Clerk app and environment |
| `Cannot connect to database` | Postgres not running or wrong `DB_*` variables | Check `docker ps` and `apps/api/.env` |
| Clerk origin error on production | Domain not in allowed origins | Add your domain in Clerk Dashboard → Customize → Domain and URLs |

## 6. Switching to Production

When you are ready to go live:
1. In Clerk Dashboard, switch to **Production** environment.
2. Copy the new `pk_live_...` and `sk_live_...` keys.
3. Update `apps/web/.env` and `apps/api/.env`.
4. Add your production domain to Clerk's authorized domains list.
5. Set strong database credentials (never use `postgres/postgres` in production).
6. Deploy your frontend and backend to your chosen hosts.
