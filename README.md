# Wasabi

Wasabi is a personal management platform for organizing documents, projects, finances, goals, and calendar events in one place. The project combines a Fastify API, a Next.js web app, PostgreSQL persistence, Redis cache, and a lightweight Tauri desktop shell.

The product is designed around a compact dashboard experience: quick access to personal and work documents, financial summaries, active projects, upcoming deadlines, and Google Calendar integration.

## Features

- Dashboard with document, project, and financial overview
- Personal and work document management
- Project tracking with status, priority, progress, color, and tags
- Financial transactions with categories, income, expenses, and summaries
- Goal tracking for financial targets
- Google Calendar OAuth integration and event listing
- JWT authentication with refresh token handling
- PostgreSQL database managed with Prisma
- Redis-backed cache layer for read-heavy screens
- Optional desktop wrapper using Tauri

## Stack

| Layer | Technology |
| --- | --- |
| Web | Next.js 14, React 18, TypeScript |
| API | Node.js, Fastify, TypeScript |
| Database | PostgreSQL, Prisma |
| Cache | Redis |
| Storage | S3-compatible API, MinIO for local development |
| Desktop | Tauri |
| Tooling | pnpm workspaces, Docker Compose, Vitest |

## Project Structure

```text
apps/
  backend/   Fastify API, domain logic, Prisma schema and migrations
  web/       Next.js application
  desktop/   Tauri desktop shell

docker-compose.yml
pnpm-workspace.yaml
package.json
README.md
```

The backend follows a layered structure with domain entities, application use cases, repository ports, and infrastructure adapters. The web app uses the Next.js App Router and talks to the API through a shared client in `apps/web/src/lib/api`.

## Local Setup

### Requirements

- Node.js 18+
- pnpm 8+
- Docker and Docker Compose

### Install

```bash
pnpm install
cp .env.example .env
docker-compose up -d
```

### Database

```bash
pnpm --filter @personal-hub/backend prisma migrate deploy
pnpm --filter @personal-hub/backend seed
```

The seed creates a demo account:

```text
Email: demo@personalhub.dev
Password: senha123
```

### Run

```bash
pnpm dev
```

Default local URLs:

```text
Web: http://localhost:3000
API: http://localhost:3001/api
Health: http://localhost:3001/health
```

## Environment

Use `.env.example` as the local template. The most important variables are:

```env
DATABASE_URL=postgresql://ph_user:ph_pass@localhost:5433/personalhub
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-in-production-min-32-chars!!
CORS_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

For Google Calendar OAuth, configure these values:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth-callback.html
```

The Google Cloud OAuth client must allow the same redirect URI.

## Scripts

```bash
pnpm dev          # run backend and web app
pnpm build        # build backend and web app
pnpm typecheck    # typecheck backend and web app
pnpm test         # run backend tests
pnpm dev:desktop  # run the Tauri shell
```

Package-level commands are also available:

```bash
pnpm --filter @personal-hub/backend dev
pnpm --filter @personal-hub/web dev
pnpm --filter @personal-hub/backend test
pnpm --filter @personal-hub/backend prisma validate
```

## Validation

Before opening a pull request or deploying a change, run:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @personal-hub/backend prisma validate
```

## Notes

- Local PostgreSQL runs on port `5433` to avoid conflicts with a system database on `5432`.
- `.env` files are intentionally ignored and should not be committed.
- The desktop app is optional for local web/API development.
