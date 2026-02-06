# Database Schema

## Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────────┐
│       users         │       │        circles          │
├─────────────────────┤       ├─────────────────────────┤
│ id (PK, UUID)       │       │ id (PK, UUID)           │
│ email (UNIQUE)      │       │ name                    │
│ name                │       │ description             │
│ role (enum)         │       │ is_active               │
│ auth_provider       │       │ created_at              │
│ google_id           │       │ updated_at              │
│ password_hash       │       └───────────┬─────────────┘
│ phone_number        │                   │
│ phone_verified      │                   │
│ is_active           │       ┌───────────┴─────────────┐
│ created_at          │       │   circle_memberships    │
│ updated_at          │       ├─────────────────────────┤
└─────────┬───────────┘       │ id (PK, UUID)           │
          │                   │ user_id (FK)            │◄──┐
          │                   │ circle_id (FK)          │   │
          │                   │ is_active               │   │
          │                   │ joined_at               │   │
          │                   │ left_at                 │   │
          │                   └─────────────────────────┘   │
          │                                                 │
          │    ┌────────────────────────────────────────────┘
          │    │
          ▼    ▼
┌─────────────────────────────────────┐
│          weekly_entries             │
├─────────────────────────────────────┤
│ id (PK, UUID)                       │
│ user_id (FK)                        │
│ circle_id (FK)                      │
│ week_start_date (DATE)              │
│ hours (NUMERIC(5,2))                │
│ description (TEXT)                  │
│ zero_hours_reason (TEXT, nullable)  │
│ created_at                          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│          reminder_runs              │
├─────────────────────────────────────┤
│ id (PK, UUID)                       │
│ week_start_date (DATE)              │
│ run_at (TIMESTAMPTZ)                │
│ total_targets (INT)                 │
│ status (enum)                       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│         reminder_targets            │
├─────────────────────────────────────┤
│ id (PK, UUID)                       │
│ reminder_run_id (FK)                │
│ user_id (FK)                        │
│ weekly_status (enum)                │
│ total_hours (NUMERIC)               │
│ notified_at (nullable)              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│           audit_logs                │
├─────────────────────────────────────┤
│ id (PK, UUID)                       │
│ actor_id (FK, nullable)             │
│ action (VARCHAR)                    │
│ entity_type (VARCHAR)               │
│ entity_id (UUID)                    │
│ old_values (JSONB)                  │
│ new_values (JSONB)                  │
│ ip_address (INET)                   │
│ created_at                          │
└─────────────────────────────────────┘
```

## SQL Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE auth_provider AS ENUM ('local', 'google');
CREATE TYPE weekly_status AS ENUM ('missing', 'zero_reason', 'under_target', 'met');
CREATE TYPE reminder_run_status AS ENUM ('pending', 'completed', 'failed');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    auth_provider auth_provider NOT NULL DEFAULT 'local',
    google_id VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    phone_number VARCHAR(20),
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_auth_provider_fields CHECK (
        (auth_provider = 'local' AND password_hash IS NOT NULL) OR
        (auth_provider = 'google' AND google_id IS NOT NULL)
    ),
    CONSTRAINT chk_phone_e164 CHECK (
        phone_number IS NULL OR phone_number ~ '^\+[1-9]\d{1,14}$'
    )
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX idx_users_role ON users(role);

-- Circles table
CREATE TABLE circles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_circles_name ON circles(name);
CREATE INDEX idx_circles_active ON circles(is_active);

-- Circle memberships table
CREATE TABLE circle_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,

    CONSTRAINT uq_user_circle UNIQUE (user_id, circle_id)
);

CREATE INDEX idx_memberships_user ON circle_memberships(user_id);
CREATE INDEX idx_memberships_circle ON circle_memberships(circle_id);
CREATE INDEX idx_memberships_active ON circle_memberships(is_active) WHERE is_active = TRUE;

-- Weekly entries table (immutable)
CREATE TABLE weekly_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE RESTRICT,
    week_start_date DATE NOT NULL, -- Always Monday in Europe/Madrid
    hours NUMERIC(5, 2) NOT NULL CHECK (hours >= 0),
    description TEXT NOT NULL,
    zero_hours_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_zero_hours_reason CHECK (
        hours > 0 OR zero_hours_reason IS NOT NULL
    ),
    CONSTRAINT chk_week_start_is_monday CHECK (
        EXTRACT(ISODOW FROM week_start_date) = 1
    )
);

-- Primary indexes for weekly_entries
CREATE INDEX idx_entries_user_week ON weekly_entries(user_id, week_start_date);
CREATE INDEX idx_entries_circle_week ON weekly_entries(circle_id, week_start_date);
CREATE INDEX idx_entries_week ON weekly_entries(week_start_date);
CREATE INDEX idx_entries_created ON weekly_entries(created_at DESC);

-- Reminder runs table
CREATE TABLE reminder_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    week_start_date DATE NOT NULL,
    run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_targets INTEGER NOT NULL DEFAULT 0,
    status reminder_run_status NOT NULL DEFAULT 'pending',
    error_message TEXT,

    CONSTRAINT chk_reminder_week_is_monday CHECK (
        EXTRACT(ISODOW FROM week_start_date) = 1
    )
);

CREATE INDEX idx_reminder_runs_week ON reminder_runs(week_start_date);
CREATE INDEX idx_reminder_runs_status ON reminder_runs(status);

-- Reminder targets table
CREATE TABLE reminder_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reminder_run_id UUID NOT NULL REFERENCES reminder_runs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weekly_status weekly_status NOT NULL,
    total_hours NUMERIC(5, 2) NOT NULL DEFAULT 0,
    notified_at TIMESTAMPTZ,
    notification_error TEXT
);

CREATE INDEX idx_reminder_targets_run ON reminder_targets(reminder_run_id);
CREATE INDEX idx_reminder_targets_user ON reminder_targets(user_id);
CREATE INDEX idx_reminder_targets_status ON reminder_targets(weekly_status);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- Useful views

-- Weekly user totals view
CREATE OR REPLACE VIEW vw_weekly_user_totals AS
SELECT
    we.user_id,
    we.week_start_date,
    SUM(we.hours) as total_hours,
    COUNT(*) as entry_count,
    BOOL_OR(we.hours = 0 AND we.zero_hours_reason IS NOT NULL) as has_zero_reason,
    CASE
        WHEN SUM(we.hours) = 0 AND NOT BOOL_OR(we.hours = 0 AND we.zero_hours_reason IS NOT NULL) THEN 'missing'
        WHEN SUM(we.hours) = 0 AND BOOL_OR(we.hours = 0 AND we.zero_hours_reason IS NOT NULL) THEN 'zero_reason'
        WHEN SUM(we.hours) < 2 THEN 'under_target'
        ELSE 'met'
    END::weekly_status as status
FROM weekly_entries we
GROUP BY we.user_id, we.week_start_date;

-- Circle metrics view
CREATE OR REPLACE VIEW vw_circle_metrics AS
SELECT
    c.id as circle_id,
    c.name as circle_name,
    we.week_start_date,
    COUNT(DISTINCT we.user_id) as contributing_users,
    SUM(we.hours) as total_hours,
    COALESCE(active_members.count, 0) as active_member_count,
    CASE
        WHEN COALESCE(active_members.count, 0) > 0
        THEN ROUND(SUM(we.hours) / active_members.count, 2)
        ELSE 0
    END as avg_hours_per_member
FROM circles c
LEFT JOIN weekly_entries we ON c.id = we.circle_id
LEFT JOIN LATERAL (
    SELECT COUNT(*) as count
    FROM circle_memberships cm
    WHERE cm.circle_id = c.id AND cm.is_active = TRUE
) active_members ON TRUE
WHERE c.is_active = TRUE
GROUP BY c.id, c.name, we.week_start_date, active_members.count;

-- Functions

-- Get Monday of a given date in Europe/Madrid timezone
CREATE OR REPLACE FUNCTION get_week_start_date(input_date DATE)
RETURNS DATE AS $$
BEGIN
    -- Get the Monday of the week containing input_date
    RETURN input_date - (EXTRACT(ISODOW FROM input_date) - 1)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get users missing hours for a specific week
CREATE OR REPLACE FUNCTION get_missing_users(target_week DATE)
RETURNS TABLE (
    user_id UUID,
    user_name VARCHAR,
    user_email VARCHAR,
    phone_number VARCHAR,
    total_hours NUMERIC,
    status weekly_status
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.name,
        u.email,
        u.phone_number,
        COALESCE(t.total_hours, 0) as total_hours,
        COALESCE(t.status, 'missing'::weekly_status) as status
    FROM users u
    LEFT JOIN vw_weekly_user_totals t ON u.id = t.user_id AND t.week_start_date = target_week
    WHERE u.is_active = TRUE
      AND u.role = 'user'
      AND (t.status IS NULL OR t.status IN ('missing', 'under_target'))
    ORDER BY
        CASE COALESCE(t.status, 'missing'::weekly_status)
            WHEN 'missing' THEN 1
            WHEN 'under_target' THEN 2
            ELSE 3
        END,
        u.name;
END;
$$ LANGUAGE plpgsql;

-- Triggers

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_circles_updated_at
    BEFORE UPDATE ON circles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

## TypeORM Entities

See `backend/src/*/entities/*.entity.ts` for TypeORM entity definitions that mirror this schema.

## Indexes Rationale

| Index | Purpose |
|-------|---------|
| `idx_entries_user_week` | User dashboard: fetch own entries by week |
| `idx_entries_circle_week` | Admin: circle metrics by week |
| `idx_entries_week` | Admin: all entries for a week (missing hours) |
| `idx_entries_created` | Admin: recent entries dashboard |
| `idx_memberships_active` | Partial index for active memberships lookup |
| `idx_audit_created` | Recent audit logs pagination |

## Migration Strategy

1. Migrations managed via TypeORM migration files
2. Run migrations on deployment via `npm run migration:run`
3. Never modify existing migrations; create new ones for changes
4. Test migrations in staging before production
5. Keep migration files in version control
