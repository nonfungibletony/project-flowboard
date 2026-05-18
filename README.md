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
- A free [Clerk](https://clerk.com/) account for authentication

### 1. Install dependencies
```bash
pnpm install
```

### 2. Configure environment variables
```bash
# Frontend
cp apps/web/.env.example apps/web/.env
# Backend
cp apps/api/.env.example apps/api/.env
```

Edit both `.env` files and fill in your Clerk API keys. See [`SETUP.md`](./SETUP.md) for a step-by-step guide on creating a Clerk application.

### 3. Start PostgreSQL
```bash
docker-compose up -d
```

### 4. Run database migrations
```bash
pnpm db:migrate
```

### 5. Start dev servers
```bash
pnpm dev
```

- Frontend: http://localhost:3002
- API: http://localhost:4000
- Health check: http://localhost:4000/health

## Feature Roadmap (Trello-style Kanban)

### ✅ MVP — Complete

| Feature | Issue | Status |
|---------|-------|--------|
| Sign up and log in (Clerk auth) | [#1](https://github.com/nonfungibletony/project-flowboard/issues/1) | ✅ Done |
| Create and list boards | [#2](https://github.com/nonfungibletony/project-flowboard/issues/2) | ✅ Done |
| Create columns in a board | [#3](https://github.com/nonfungibletony/project-flowboard/issues/3) | ✅ Done |
| Create cards in a column | [#4](https://github.com/nonfungibletony/project-flowboard/issues/4) | ✅ Done |
| Drag and drop to move cards | [#5](https://github.com/nonfungibletony/project-flowboard/issues/5) | ✅ Done |
| Edit card details | [#6](https://github.com/nonfungibletony/project-flowboard/issues/6) | ✅ Done |
| Comment on a card | [#7](https://github.com/nonfungibletony/project-flowboard/issues/7) | ✅ Done |

### 🔧 Phase 1 — Core CRUD Completeness

Missing delete/archive operations and polish that makes the board feel complete.

| Feature | Issue | Priority |
|---------|-------|----------|
| Delete / archive a board | [#20](https://github.com/nonfungibletony/project-flowboard/issues/20) | High |
| Delete / archive a card | [#21](https://github.com/nonfungibletony/project-flowboard/issues/21) | High |
| Logout UI/UX button | [#11](https://github.com/nonfungibletony/project-flowboard/issues/11) | High |
| Reorder columns by drag and drop | [#27](https://github.com/nonfungibletony/project-flowboard/issues/27) | Medium |

### 🏷️ Phase 2 — Organisation & Discovery

Trello-style labels, due dates, search, and visual hierarchy.

| Feature | Issue | Priority |
|---------|-------|----------|
| Labels / tags for cards | [#22](https://github.com/nonfungibletony/project-flowboard/issues/22) | Medium |
| Due dates on cards | [#23](https://github.com/nonfungibletony/project-flowboard/issues/23) | Medium |
| Search and filter cards | [#26](https://github.com/nonfungibletony/project-flowboard/issues/26) | Medium |

### 👥 Phase 3 — Collaboration

Multi-user sharing, permissions, and visibility.

| Feature | Issue | Priority |
|---------|-------|----------|
| Board members / sharing | [#24](https://github.com/nonfungibletony/project-flowboard/issues/24) | Medium |
| Activity log / audit trail | [#30](https://github.com/nonfungibletony/project-flowboard/issues/30) | Low |

### ⚡ Phase 4 — Power User Features

Checklists, attachments, templates, backgrounds, and keyboard shortcuts.

| Feature | Issue | Priority |
|---------|-------|----------|
| Card checklists / subtasks | [#29](https://github.com/nonfungibletony/project-flowboard/issues/29) | Low |
| Attachments / file uploads | [#25](https://github.com/nonfungibletony/project-flowboard/issues/25) | Low |
| Board templates / starred boards | [#28](https://github.com/nonfungibletony/project-flowboard/issues/28) | Low |
| Board backgrounds / cover colours | [#31](https://github.com/nonfungibletony/project-flowboard/issues/31) | Low |
| Keyboard shortcuts | [#32](https://github.com/nonfungibletony/project-flowboard/issues/32) | Low |

### 🚀 Phase 5 — Infrastructure & Scale

Deployment, real-time sync, and auth architecture.

| Feature | Issue | Priority |
|---------|-------|----------|
| Evaluate httpOnly cookie session architecture | [#12](https://github.com/nonfungibletony/project-flowboard/issues/12) | Medium |
| Real-time updates (WebSockets or SSE) | — | Medium |
| Deploy (Vercel frontend + Railway/Fly.io backend) | — | Medium |

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
