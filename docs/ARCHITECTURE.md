# Circle Hours Logger - Architecture Document

## Overview

A production-ready web application for tracking weekly sociocracy "circle" contribution hours at a small school. Built with Angular + NgRx frontend and NestJS backend, deployed via Docker.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              NGINX (Reverse Proxy)                       │
│                         (SSL termination, static files)                  │
└─────────────────────────────────────────────────────────────────────────┘
                    │                                │
                    ▼                                ▼
┌─────────────────────────────┐    ┌─────────────────────────────────────┐
│      Angular Frontend       │    │         NestJS Backend API          │
│    (nginx static serve)     │    │                                     │
│                             │    │  ┌─────────────────────────────┐    │
│  ┌───────────────────────┐  │    │  │     Auth Module             │    │
│  │   NgRx Store          │  │    │  │  (Google OAuth, Local Auth) │    │
│  │  ├─ auth              │  │    │  └─────────────────────────────┘    │
│  │  ├─ circles           │  │    │  ┌─────────────────────────────┐    │
│  │  ├─ entries           │  │    │  │     Users Module            │    │
│  │  ├─ summaries         │  │    │  └─────────────────────────────┘    │
│  │  └─ admin             │  │    │  ┌─────────────────────────────┐    │
│  └───────────────────────┘  │    │  │     Circles Module          │    │
│                             │    │  └─────────────────────────────┘    │
│  ┌───────────────────────┐  │    │  ┌─────────────────────────────┐    │
│  │   Angular Material    │  │    │  │     Entries Module          │    │
│  │   (Nature Theme)      │  │    │  └─────────────────────────────┘    │
│  └───────────────────────┘  │    │  ┌─────────────────────────────┐    │
└─────────────────────────────┘    │  │     Admin Module            │    │
                                   │  └─────────────────────────────┘    │
                                   │  ┌─────────────────────────────┐    │
                                   │  │     Reports Module          │    │
                                   │  └─────────────────────────────┘    │
                                   │  ┌─────────────────────────────┐    │
                                   │  │     Reminders Module        │    │
                                   │  │  (Cron: Mon 07:00 Madrid)   │    │
                                   │  └─────────────────────────────┘    │
                                   └─────────────────────────────────────┘
                                                    │
                                                    ▼
                                   ┌─────────────────────────────────────┐
                                   │           PostgreSQL 15             │
                                   │                                     │
                                   │  Tables:                            │
                                   │  - users                            │
                                   │  - circles                          │
                                   │  - circle_memberships               │
                                   │  - weekly_entries                   │
                                   │  - reminder_runs                    │
                                   │  - reminder_targets                 │
                                   │  - audit_logs                       │
                                   └─────────────────────────────────────┘
```

## Key Design Decisions

### 1. Authentication Strategy: JWT with Refresh Tokens

**Choice:** JWT access tokens (15min) + HTTP-only refresh tokens (7 days)

**Justification:**
- Stateless API servers (horizontal scaling)
- Refresh tokens in HTTP-only cookies prevent XSS token theft
- Short-lived access tokens limit exposure window
- Works well with Google OAuth flow
- No server-side session storage needed

### 2. Frontend Serving: Nginx Static

**Choice:** Serve Angular build via nginx container

**Justification:**
- Optimal static file serving with gzip/brotli compression
- Efficient caching headers
- Lower memory footprint than Node SSR
- SPA routing handled via try_files
- Production-grade performance out of the box

### 3. Week Computation: Server-Side Only

**Choice:** All weekStartDate computation happens server-side

**Justification:**
- Single source of truth for Europe/Madrid timezone
- Prevents client timezone inconsistencies
- Frontend sends ISO date, backend computes canonical Monday
- Consistent reporting across all clients

### 4. Entry Immutability

**Choice:** No edit/delete for weekly entries in MVP

**Justification:**
- Audit trail integrity
- Simpler data model
- Prevents accidental data loss
- Future: soft-delete or amendment entries if needed

## Module Breakdown

### Backend Modules (NestJS)

```
src/
├── app.module.ts
├── config/
│   ├── configuration.ts          # Environment config loader
│   └── validation.schema.ts      # Joi validation for env vars
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── roles.decorator.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── jwt-refresh.guard.ts
│   │   └── roles.guard.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── interceptors/
│   │   └── logging.interceptor.ts
│   ├── pipes/
│   │   └── validation.pipe.ts
│   └── utils/
│       ├── date.utils.ts         # Week computation, timezone handling
│       └── pagination.utils.ts
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   ├── jwt-refresh.strategy.ts
│   │   ├── google.strategy.ts
│   │   └── local.strategy.ts
│   └── dto/
│       ├── register.dto.ts
│       ├── login.dto.ts
│       └── tokens.dto.ts
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── entities/
│   │   └── user.entity.ts
│   └── dto/
│       ├── update-profile.dto.ts
│       └── user-response.dto.ts
├── circles/
│   ├── circles.module.ts
│   ├── circles.controller.ts
│   ├── circles.service.ts
│   ├── entities/
│   │   ├── circle.entity.ts
│   │   └── circle-membership.entity.ts
│   └── dto/
├── entries/
│   ├── entries.module.ts
│   ├── entries.controller.ts
│   ├── entries.service.ts
│   ├── entities/
│   │   └── weekly-entry.entity.ts
│   └── dto/
│       ├── create-entry.dto.ts
│       ├── entry-filters.dto.ts
│       └── entry-response.dto.ts
├── admin/
│   ├── admin.module.ts
│   ├── admin.controller.ts
│   ├── admin.service.ts
│   └── dto/
├── reports/
│   ├── reports.module.ts
│   ├── reports.controller.ts
│   └── reports.service.ts         # CSV streaming generation
├── reminders/
│   ├── reminders.module.ts
│   ├── reminders.controller.ts
│   ├── reminders.service.ts
│   ├── reminders.scheduler.ts     # Cron job
│   └── entities/
│       ├── reminder-run.entity.ts
│       └── reminder-target.entity.ts
└── database/
    ├── migrations/
    └── seeds/
```

### Frontend Modules (Angular)

```
src/
├── app/
│   ├── app.component.ts
│   ├── app.config.ts
│   ├── app.routes.ts
│   ├── core/
│   │   ├── interceptors/
│   │   │   ├── auth.interceptor.ts
│   │   │   └── error.interceptor.ts
│   │   ├── guards/
│   │   │   ├── auth.guard.ts
│   │   │   ├── admin.guard.ts
│   │   │   └── first-time.guard.ts
│   │   └── services/
│   │       ├── api.service.ts
│   │       └── storage.service.ts
│   ├── shared/
│   │   ├── components/
│   │   │   ├── week-selector/
│   │   │   ├── circle-selector/
│   │   │   ├── status-badge/
│   │   │   ├── loading-spinner/
│   │   │   └── empty-state/
│   │   ├── pipes/
│   │   │   ├── week-range.pipe.ts
│   │   │   └── hours-format.pipe.ts
│   │   └── directives/
│   ├── store/
│   │   ├── auth/
│   │   │   ├── auth.actions.ts
│   │   │   ├── auth.reducer.ts
│   │   │   ├── auth.effects.ts
│   │   │   ├── auth.selectors.ts
│   │   │   └── auth.feature.ts
│   │   ├── circles/
│   │   ├── entries/
│   │   ├── summaries/
│   │   └── admin/
│   ├── features/
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── first-time-profile/
│   │   ├── dashboard/
│   │   ├── log-hours/
│   │   ├── history/
│   │   ├── profile/
│   │   └── admin/
│   │       ├── dashboard/
│   │       ├── users/
│   │       ├── circles/
│   │       ├── reports/
│   │       └── reminders/
│   └── styles/
│       ├── _variables.scss
│       ├── _theme.scss
│       └── _utilities.scss
└── environments/
```

## Data Flow

### User Logs Hours

```
1. User selects week, circle, enters hours + description
   │
2. Frontend validates (required fields, hours >= 0, reason if hours = 0)
   │
3. POST /me/entries { date: "2024-01-15", circleId, hours, description, zeroHoursReason? }
   │
4. Backend computes weekStartDate (Monday of that week in Europe/Madrid)
   │
5. Creates WeeklyEntry record
   │
6. Returns created entry
   │
7. NgRx effect updates entries state
   │
8. Selectors recompute weekly totals, status
   │
9. Dashboard reflects updated data
```

### Admin Views Missing Hours

```
1. Admin navigates to /admin/dashboard
   │
2. NgRx effect dispatches loadAdminDashboard
   │
3. GET /admin/dashboard
   │
4. Backend computes for previous week(s):
   │   - Users with no entries
   │   - Users with 0 total hours (no reason)
   │   - Users under 2 hours
   │   - Users meeting target
   │
5. Returns categorized user lists + metrics
   │
6. NgRx stores in admin slice
   │
7. Components render prioritized lists
```

## Weekly Status Classification Logic

```typescript
enum WeeklyStatus {
  MISSING = 'missing',           // No entries OR total=0 without reason
  ZERO_WITH_REASON = 'zero_reason', // total=0 with at least one reason
  UNDER_TARGET = 'under_target', // 0 < total < 2
  MET = 'met',                   // total >= 2
}

function computeWeeklyStatus(entries: WeeklyEntry[]): WeeklyStatus {
  if (entries.length === 0) {
    return WeeklyStatus.MISSING;
  }

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const hasZeroReason = entries.some(e => e.hours === 0 && e.zeroHoursReason);

  if (totalHours === 0) {
    return hasZeroReason ? WeeklyStatus.ZERO_WITH_REASON : WeeklyStatus.MISSING;
  }

  if (totalHours < 2) {
    return WeeklyStatus.UNDER_TARGET;
  }

  return WeeklyStatus.MET;
}
```

## Assumptions

1. **Single School Instance:** One deployment per school, no multi-tenancy
2. **Small Scale:** <500 users, <50 circles - no sharding needed
3. **Google Workspace:** School uses Google Workspace for SSO
4. **Browser Support:** Modern browsers only (Chrome, Firefox, Safari, Edge - latest 2 versions)
5. **No Offline Mode:** Always-connected assumption for MVP
6. **Admin Bootstrap:** First admin created via seed script or manual DB insert
7. **Circle Management:** Circles and memberships managed via admin UI or direct DB (no self-service in MVP)
8. **No Entry Amendments:** Truly immutable entries; corrections require new entries with notes
9. **Report Retention:** No automatic data purging; all history retained
10. **Telegram Bot Token:** Will be configured via env var when implemented
11. **HTTPS Everywhere:** SSL termination at nginx/load balancer level
12. **UTC Database Storage:** All timestamps stored as UTC, converted to Europe/Madrid for display/computation
