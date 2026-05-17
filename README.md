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
- ✅ Move cards between columns
- ✅ Edit card details
- ✅ Comment on a card

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all dev servers |
| `pnpm build` | Build all packages |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run Drizzle migrations |
| `pnpm db:studio` | Open Drizzle Studio GUI |

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Health check |
| GET/POST | `/users` | List / create users |
| GET/POST | `/boards` | List / create boards |
| GET | `/boards/:id/columns` | Get columns with cards |
| POST | `/boards/:id/columns` | Create column |
| POST | `/columns/:id/cards` | Create card |
| PATCH | `/cards/:id/move` | Move card to new column |
| PATCH | `/cards/:id` | Edit card |
| GET/POST | `/cards/:id/comments` | List / add comments |

## Post-MVP (see GitHub Issues)

- [ ] Add logout UI/UX button ([#11](https://github.com/nonfungibletony/project-flowboard/issues/11))
- [ ] Evaluate httpOnly cookie session architecture ([#12](https://github.com/nonfungibletony/project-flowboard/issues/12))
- [ ] Implement drag-and-drop (react-beautiful-dnd or @dnd-kit)
- [ ] Add card detail modal with comments
- [ ] Real-time updates (WebSockets or SSE)
- [ ] Deploy (Vercel frontend + Railway/Fly.io backend)

## License

MIT
