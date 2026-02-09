# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Circle Hours Logger — a web app for tracking weekly sociocracy "circle" contribution hours at a small school. Single-tenant (one school per deployment), <500 users expected.

## Tech Stack

- **Frontend**: Angular 17 (standalone components, no modules) + NgRx + Angular Material + SCSS
- **Backend**: NestJS 10 + TypeORM 0.3 + PostgreSQL 15
- **Auth**: JWT (15min access token in localStorage) + HTTP-only refresh cookie (7 days) + Google OAuth via Passport
- **i18n**: @ngx-translate (English, Spanish)
- **Testing**: Jest (unit), @testing-library/angular (component), Playwright (E2E), Storybook (visual), Supertest (API E2E)

## Development Commands

### Starting the stack

```bash
./scripts/dev-local.sh          # Postgres in Docker + local Node servers with hot reload
./scripts/dev-docker.sh         # Full stack in Docker with hot reload
docker compose up postgres -d   # Just the database
```

### Backend (from `backend/`)

```bash
npm run start:dev               # Dev server with watch
npm test                        # Unit tests
npm run test:e2e                # API E2E tests (Supertest)
npm run test:cov                # Coverage report
npm run lint                    # ESLint + Prettier
npm run seed                    # Seed default admin (admin@school.org / Admin123!)
```

> **Note:** In development, `TypeORM.synchronize` is enabled — the database schema is auto-created from entities on startup. No migrations are needed for dev. Migrations are for production only (not yet set up).

### Frontend (from `frontend/`)

```bash
npm start                       # Dev server (http://localhost:4200)
npm test                        # Jest unit tests
npm run test:e2e                # Playwright E2E
npm run test:e2e:ui             # Playwright with UI
npm run lint                    # ESLint
npm run storybook               # Storybook (http://localhost:6006)
```

### Running a single test

```bash
# Backend — run one test file
cd backend && npx jest --testPathPattern=users.service.spec
# Frontend — run one test file
cd frontend && npx jest --testPathPattern=dashboard.component.spec
# Playwright — run one E2E spec
cd frontend && npx playwright test e2e/login.spec.ts
```

### Access points

- Frontend: http://localhost:4200
- API: http://localhost:3000
- Swagger docs: http://localhost:3000/api/docs (dev/test only)

## Architecture

### Backend (NestJS)

Modular NestJS with a global `api/v1` prefix. Each module owns its entities, DTOs, service, and controller.

**Modules**: Auth, Users, Circles, Entries, Admin, Reports, Reminders, Health

**Key patterns**:
- Env vars validated at startup via Joi schema in `app.module.ts`
- `TypeORM.synchronize` is ON in development only — use migrations for prod
- Global `ThrottlerGuard` (60 req/min) applied via `APP_GUARD`
- Custom decorators: `@CurrentUser()` extracts user from JWT, `@Roles()` for RBAC
- Guards: `JwtAuthGuard`, `JwtRefreshGuard`, `RolesGuard`
- Entities auto-discovered via glob: `__dirname + '/**/*.entity{.ts,.js}'`
- Path alias: `@/*` maps to `src/*`
- Cron: Reminders run every Monday at 07:00 Europe/Madrid

**Database**:
- All dates stored as UTC; week computation uses Europe/Madrid timezone via date-fns-tz
- `week_start_date` is always server-computed (Monday-based ISO weeks) — never trust client
- DB views (`vw_weekly_user_totals`, `vw_circle_metrics`) and SQL functions (`get_week_start_date()`, `get_missing_users()`) handle aggregations
- Entries are immutable (no update/delete) for audit integrity
- Soft deletes via `is_active` flag, not TypeORM soft delete

### Frontend (Angular 17)

All components are standalone (no NgModules). Lazy-loaded routes in `app.routes.ts`.

**Route structure**:
- Public: `/login`, `/register`, `/auth/callback`
- User (`/app/*`): dashboard, log-hours, history, profile — guarded by auth + firstTime + approval + user role
- Admin (`/admin/*`): dashboard, users, circles, reports, reminders, backfill — guarded by admin role
- `AdminShellComponent` provides the admin layout wrapper

**NgRx store slices** (in `store/`): auth, circles, entries, summaries, admin — each with entity adapters where applicable.

**HTTP layer**:
- `authInterceptor`: attaches Bearer token, handles refresh on 401
- `errorInterceptor`: maps API errors to user-facing messages
- Services in `core/services/` wrap HttpClient calls

**Guards**: authGuard, guestGuard, adminGuard, userGuard, firstTimeGuard, approvalGuard

## Detailed Documentation

The `docs/` folder contains authoritative specs:
- `ARCHITECTURE.md` — system design, data flows, design decisions
- `API_SPECIFICATION.md` — all REST endpoints with request/response examples
- `DATABASE_SCHEMA.md` — full SQL schema, views, functions, indexes
- `NGRX_STORE_DESIGN.md` — complete NgRx design for all store slices
- `TESTING_STRATEGY.md` — testing pyramid, example tests, CI workflow
- `SECURITY_CHECKLIST.md` — security considerations
