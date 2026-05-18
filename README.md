# Project Flowboard — Kanban-style Board MVP

A group project monorepo: React + Vite frontend, Express + Drizzle ORM backend, PostgreSQL database.

## Architecture

```
project-flowboard/
├── apps/
│   ├── web/          # React + Vite frontend (port 3002)
│   └── api/          # Express + TypeScript backend (port 4000)
├── packages/
│   ├── shared/       # Zod schemas + shared types
│   └── db/           # Drizzle ORM schema + migrations
├── docker-compose.yml
├── package.json      # Root workspace (pnpm + turbo)
└── turbo.json        # Pipeline orchestration
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router, TypeScript |
| Backend | Express, TypeScript, Zod validation |
| Database | PostgreSQL 15, Drizzle ORM |
| Shared | Zod schemas for API contracts |
| Workspace | pnpm workspaces + Turbo |

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL)

### 1. Install dependencies
```bash
pnpm install
```

### 2. Start PostgreSQL
```bash
docker-compose up -d
```

### 3. Run database migrations
```bash
pnpm db:migrate
```

### 4. Start dev servers
```bash
pnpm dev
```

- Frontend: http://localhost:3002
- API: http://localhost:4000
- Health check: http://localhost:4000/health

## User Stories (MVP)

- ✅ Sign up and log in (Clerk auth — see #1)
- ✅ Create a board
- ✅ Create columns in a board
- ✅ Create cards in a column
- ✅ Move cards between columns (drag and drop)
- ✅ Edit card details
- ✅ Comment on a card

## Post-MVP (see GitHub Issues)

- [ ] Add logout UI/UX button ([#11](https://github.com/nonfungibletony/project-flowboard/issues/11))
- [ ] Evaluate httpOnly cookie session architecture ([#12](https://github.com/nonfungibletony/project-flowboard/issues/12))
- [ ] Real-time updates (WebSockets or SSE)
- [ ] Deploy (Vercel frontend + Railway/Fly.io backend)

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Health check |
| GET/POST | `/api/boards` | List / create boards |
| GET/POST | `/api/boards/:id/columns` | Get columns with cards / create column |
| POST | `/api/boards/columns/:id/cards` | Create card |
| PATCH | `/api/boards/cards/:id/move` | Move card to new column |
| PATCH | `/api/boards/cards/:id` | Edit card |
| GET/POST | `/api/boards/cards/:id/comments` | List / add comments |
| GET | `/api/me` | Current user |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all dev servers |
| `pnpm build` | Build all packages |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run Drizzle migrations |
| `pnpm db:studio` | Open Drizzle Studio GUI |

## License

MIT
