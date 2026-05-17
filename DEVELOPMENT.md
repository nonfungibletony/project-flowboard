# Development Guide

## Prerequisites

- Node.js 20+ (check with `node --version`)
- pnpm 9+ (install: `npm install -g pnpm`)
- Docker + Docker Compose

## Quick Start

```bash
# 1. Clone
git clone https://github.com/nonfungibletony/project-flowboard.git
cd project-flowboard

# 2. Install dependencies
pnpm install

# 3. Copy env files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. Start PostgreSQL
docker-compose up -d

# 5. Run database migrations
pnpm db:migrate

# 6. Start all dev servers
pnpm dev
```

Open:
- Frontend: http://localhost:3000
- API: http://localhost:4000
- API Health: http://localhost:4000/health

## Clerk Authentication Setup

1. Create an account at https://clerk.com
2. Create a new application
3. Copy your **Publishable key** to `apps/web/.env`:
   ```
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
   ```
4. Copy your **Secret key** to `apps/api/.env`:
   ```
   CLERK_SECRET_KEY=sk_test_...
   ```
5. (Optional) In Clerk Dashboard → JWT Templates, create a template with `email` and `name` claims if you want richer user data.

No additional backend webhook configuration is needed for the MVP — users are synced to the local PostgreSQL `users` table on their first authenticated request.

## Workspace Commands

| Command | Runs where | Description |
|---------|-----------|-------------|
| `pnpm dev` | root | Starts all apps in parallel (turbo) |
| `pnpm --filter @group/api dev` | api only | Backend only |
| `pnpm --filter @group/web dev` | web only | Frontend only |
| `pnpm db:migrate` | db package | Run Drizzle migrations |
| `pnpm db:studio` | db package | Open Drizzle Studio GUI at http://localhost:4983 |
| `pnpm build` | root | Build all packages |

## Adding a New Package

1. Create folder under `packages/your-package/`
2. Add `package.json` with `"name": "@group/your-package"`
3. Add it to `pnpm-workspace.yaml`
4. Run `pnpm install` from root

## Database Changes

```bash
# Edit packages/db/src/schema.ts
# Then:
pnpm db:generate   # Creates migration file
pnpm db:migrate    # Applies to PostgreSQL
pnpm db:studio     # Browse data visually
```

## Code Style

- **Formatter**: Prettier (`.prettierrc` at root)
- **Editor**: EditorConfig (`.editorconfig` at root)
- Indent: 2 spaces, no semicolons, single quotes

## Troubleshooting

**Port conflicts**: Change `PORT` in `apps/api/.env` and `VITE_API_URL` in `apps/web/.env`

**Database connection errors**: Make sure `docker-compose up -d` is running and `.env` values match `docker-compose.yml`

**pnpm workspace issues**: Delete `node_modules` at root and all apps/packages, then `pnpm install`
