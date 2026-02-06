-- Circle Hours Logger Database Initialization
-- This script runs on first database creation

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE auth_provider AS ENUM ('local', 'google');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE weekly_status AS ENUM ('missing', 'zero_reason', 'under_target', 'met');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE reminder_run_status AS ENUM ('pending', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    "authProvider" auth_provider NOT NULL DEFAULT 'local',
    "googleId" VARCHAR(255) UNIQUE,
    "passwordHash" VARCHAR(255),
    "phoneNumber" VARCHAR(20),
    "phoneVerified" BOOLEAN NOT NULL DEFAULT FALSE,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users("googleId") WHERE "googleId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Circles table
CREATE TABLE IF NOT EXISTS circles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_circles_name ON circles(name);
CREATE INDEX IF NOT EXISTS idx_circles_active ON circles("isActive");

-- Circle memberships table
CREATE TABLE IF NOT EXISTS circle_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "circleId" UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "leftAt" TIMESTAMPTZ,
    CONSTRAINT uq_user_circle UNIQUE ("userId", "circleId")
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON circle_memberships("userId");
CREATE INDEX IF NOT EXISTS idx_memberships_circle ON circle_memberships("circleId");
CREATE INDEX IF NOT EXISTS idx_memberships_active ON circle_memberships("isActive") WHERE "isActive" = TRUE;

-- Weekly entries table (immutable)
CREATE TABLE IF NOT EXISTS weekly_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    "circleId" UUID NOT NULL REFERENCES circles(id) ON DELETE RESTRICT,
    "weekStartDate" DATE NOT NULL,
    hours NUMERIC(5, 2) NOT NULL CHECK (hours >= 0),
    description TEXT NOT NULL,
    "zeroHoursReason" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_zero_hours_reason CHECK (hours > 0 OR "zeroHoursReason" IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_entries_user_week ON weekly_entries("userId", "weekStartDate");
CREATE INDEX IF NOT EXISTS idx_entries_circle_week ON weekly_entries("circleId", "weekStartDate");
CREATE INDEX IF NOT EXISTS idx_entries_week ON weekly_entries("weekStartDate");
CREATE INDEX IF NOT EXISTS idx_entries_created ON weekly_entries("createdAt" DESC);

-- Reminder runs table
CREATE TABLE IF NOT EXISTS reminder_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "weekStartDate" DATE NOT NULL,
    "runAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "totalTargets" INTEGER NOT NULL DEFAULT 0,
    status reminder_run_status NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT
);

CREATE INDEX IF NOT EXISTS idx_reminder_runs_week ON reminder_runs("weekStartDate");
CREATE INDEX IF NOT EXISTS idx_reminder_runs_status ON reminder_runs(status);

-- Reminder targets table
CREATE TABLE IF NOT EXISTS reminder_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "reminderRunId" UUID NOT NULL REFERENCES reminder_runs(id) ON DELETE CASCADE,
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "weeklyStatus" weekly_status NOT NULL,
    "totalHours" NUMERIC(5, 2) NOT NULL DEFAULT 0,
    "notifiedAt" TIMESTAMPTZ,
    "notificationError" TEXT
);

CREATE INDEX IF NOT EXISTS idx_reminder_targets_run ON reminder_targets("reminderRunId");
CREATE INDEX IF NOT EXISTS idx_reminder_targets_user ON reminder_targets("userId");
CREATE INDEX IF NOT EXISTS idx_reminder_targets_status ON reminder_targets("weeklyStatus");

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_circles_updated_at ON circles;
CREATE TRIGGER trg_circles_updated_at
    BEFORE UPDATE ON circles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to get Monday of a given date
CREATE OR REPLACE FUNCTION get_week_start_date(input_date DATE)
RETURNS DATE AS $$
BEGIN
    RETURN input_date - (EXTRACT(ISODOW FROM input_date) - 1)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Insert seed data for development
INSERT INTO users (id, email, name, role, "authProvider", "passwordHash")
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin@school.org',
    'Admin User',
    'admin',
    'local',
    -- Password: Admin123! (bcryptjs hash, rounds 12)
    '$2a$12$mw.4U0osxkb4cbHPRc0Lme2U2jetzrf6lhT48P1p0UB5X3ZzsXpQG'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO circles (id, name, description) VALUES
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Infrastructure', 'Technical infrastructure and maintenance'),
    ('b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'General', 'General circle for school-wide decisions'),
    ('b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'HR', 'Human resources and personnel'),
    ('b4eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Education', 'Educational programs and curriculum')
ON CONFLICT (name) DO NOTHING;

-- Grant admin membership to all circles
INSERT INTO circle_memberships ("userId", "circleId")
SELECT
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    id
FROM circles
ON CONFLICT ("userId", "circleId") DO NOTHING;

-- Create sample regular users
INSERT INTO users (id, email, name, role, "authProvider", "passwordHash", "phoneNumber")
VALUES
    ('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'maria@school.org', 'María García', 'user', 'local',
     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.GQaKqUCUrkOWq6', '+34612345678'),
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'carlos@school.org', 'Carlos López', 'user', 'local',
     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.GQaKqUCUrkOWq6', '+34612345679'),
    ('c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'ana@school.org', 'Ana Martín', 'user', 'local',
     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.GQaKqUCUrkOWq6', NULL)
ON CONFLICT (email) DO NOTHING;

-- Add users to circles
INSERT INTO circle_memberships ("userId", "circleId")
VALUES
    ('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    ('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'),
    ('c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b4eebc99-9c0b-4ef8-bb6d-6bb9bd380a14')
ON CONFLICT ("userId", "circleId") DO NOTHING;

DO $$ BEGIN RAISE NOTICE 'Database initialization completed successfully'; END $$;
