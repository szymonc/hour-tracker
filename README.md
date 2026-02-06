# Circle Hours Logger

A production-ready web application for tracking weekly sociocracy "circle" contribution hours at a small school.

## Features

- **User Management**: Google SSO + email/password authentication
- **Hours Tracking**: Log hours against specific circles with weekly aggregation
- **Dashboard**: View last 4 weeks totals, current/last month summaries
- **History**: Full entry history with filters and pagination
- **Admin Dashboard**: System-wide metrics, missing hours tracking, CSV exports
- **Reminder System**: Scheduled job for Telegram notifications (placeholder for MVP)

## Tech Stack

- **Frontend**: Angular 17 + Angular Material + NgRx
- **Backend**: NestJS + TypeORM + PostgreSQL
- **Deployment**: Docker + Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- Google Cloud Console project (for OAuth)

### 1. Clone and Configure

```bash
# Clone the repository
git clone <repository-url>
cd hlogger

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
# Generate JWT secrets: openssl rand -base64 32
```

### 2. Start with Docker Compose

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f

# Access the application
# Frontend: http://localhost:4200
# API: http://localhost:3000
# API Docs: http://localhost:3000/api/docs
```

### 3. Default Credentials

The seed data creates a default admin user:
- **Email**: admin@school.org
- **Password**: Admin123!

## Development Setup

### Backend

```bash
cd backend

# Install dependencies
npm install

# Start PostgreSQL (via Docker)
docker compose up postgres -d

# Run migrations
npm run migration:run

# Start development server
npm run start:dev
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

### Docker with hot reload (BE + FE)

You can run the full stack in Docker with **hot reload** so code changes in `backend/` and `frontend/` are picked up without rebuilding images.

- **Backend**: NestJS runs in watch mode (`nest start --watch`); source is mounted, so edits trigger a restart.
- **Frontend**: Angular runs `ng serve` with file polling; edits trigger HMR (Hot Module Replacement).

```bash
# Start all services with dev override (builds dev images on first run)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Frontend: http://localhost:4200  (Angular dev server)
# API: http://localhost:3000
# API Docs: http://localhost:3000/api/docs
```

- Use **production** compose when you want built, optimized images (e.g. staging/production): `docker compose up -d`.
- Use **dev** compose when you are coding and want instant feedback; the first build can take a few minutes while dependencies install.

**Convenience scripts** (run from project root):

| Script | What it does |
|--------|----------------|
| `./scripts/dev-local.sh` | Postgres in Docker; backend and frontend run on the host with hot reload. Requires `npm install` in `backend/` and `frontend/` once. |
| `./scripts/dev-docker.sh` | Full stack in Docker with hot reload (same as `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build`). |

## Project Structure

```
hlogger/
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── users/          # User management
│   │   ├── circles/        # Circle entities
│   │   ├── entries/        # Weekly entries
│   │   ├── admin/          # Admin dashboard
│   │   ├── reports/        # CSV exports
│   │   ├── reminders/      # Scheduled jobs
│   │   └── common/         # Shared utilities
│   └── Dockerfile
├── frontend/                # Angular application
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/       # Guards, interceptors, services
│   │   │   ├── shared/     # Reusable components
│   │   │   ├── store/      # NgRx state management
│   │   │   └── features/   # Feature modules
│   │   └── styles/         # SCSS theme
│   └── Dockerfile
├── docker/
│   └── postgres/           # Database initialization
├── docs/                   # Documentation
│   ├── ARCHITECTURE.md
│   ├── API_SPECIFICATION.md
│   ├── DATABASE_SCHEMA.md
│   ├── NGRX_STORE_DESIGN.md
│   ├── TESTING_STRATEGY.md
│   └── SECURITY_CHECKLIST.md
└── docker-compose.yml
```

## API Documentation

API documentation is available at `/api/docs` when running the backend.

Key endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register with email/password |
| POST | /auth/login | Login |
| GET | /auth/google | Google OAuth |
| GET | /me | Get current user |
| PATCH | /me | Update profile (phone) |
| GET | /me/circles | Get user's circles |
| GET | /me/entries | Get entries with filters |
| POST | /me/entries | Create new entry |
| GET | /me/entries/summary | Weekly summaries |
| GET | /admin/dashboard | Admin dashboard |
| GET | /admin/reports/csv | Download CSV report |

## Testing

### Backend Tests

```bash
cd backend

# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

### Frontend Tests

```bash
cd frontend

# Unit tests
npm test

# E2E tests (Playwright)
npm run test:e2e

# Storybook
npm run storybook
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment | development |
| DATABASE_HOST | PostgreSQL host | localhost |
| DATABASE_PORT | PostgreSQL port | 5432 |
| DATABASE_USER | PostgreSQL user | hlogger |
| DATABASE_PASSWORD | PostgreSQL password | - |
| DATABASE_NAME | Database name | hlogger |
| JWT_ACCESS_SECRET | Access token secret | - |
| JWT_REFRESH_SECRET | Refresh token secret | - |
| GOOGLE_CLIENT_ID | Google OAuth client ID | - |
| GOOGLE_CLIENT_SECRET | Google OAuth secret | - |
| GOOGLE_CALLBACK_URL | OAuth callback URL | - |
| FRONTEND_URL | Frontend URL for CORS | http://localhost:4200 |

## Production Deployment

1. **Configure environment variables** with production values
2. **Set up SSL** via reverse proxy (nginx, Traefik, etc.)
3. **Configure Google OAuth** with production callback URL
4. **Run database migrations** before starting the API
5. **Set NODE_ENV=production** in all containers

```bash
# Production build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Weekly Status Classification

| Status | Condition |
|--------|-----------|
| Missing | No entries OR total = 0 without reason |
| 0h with reason | Total = 0 with at least one zero-hours reason |
| Under target | 0 < total < 2 hours |
| Met | Total >= 2 hours |

## Contributing

1. Create a feature branch
2. Make changes with tests
3. Submit a pull request

## License

Private - All rights reserved
