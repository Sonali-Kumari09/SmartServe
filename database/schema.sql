-- File: backend/database/schema.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'ngo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  baseline_attendance INTEGER NOT NULL DEFAULT 500 CHECK (baseline_attendance >= 0),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (date, meal_type)
);
CREATE INDEX IF NOT EXISTS menus_date_idx ON menus(date);

CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id VARCHAR(100) NOT NULL UNIQUE,
  food_item VARCHAR(160) NOT NULL,
  quantity_kg NUMERIC(12, 3) NOT NULL CHECK (quantity_kg >= 0),
  time_prepared TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_temp_f NUMERIC(6, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Safe' CHECK (status IN ('Safe', 'Warning', 'Spoiled/Unsafe', 'Redistributed')),
  location VARCHAR(200),
  checked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL,
  contact_person VARCHAR(160),
  phone VARCHAR(40),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  capacity_kg NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (capacity_kg >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS surplus_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_ref UUID NOT NULL REFERENCES inventory_logs(id) ON DELETE RESTRICT,
  food_item VARCHAR(160) NOT NULL,
  quantity_kg NUMERIC(12, 3) NOT NULL CHECK (quantity_kg >= 0),
  weight_lbs NUMERIC(12, 3) GENERATED ALWAYS AS (quantity_kg * 2.20462) STORED,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Matched', 'Delivered', 'Expired')),
  matched_to UUID REFERENCES recipients(id) ON DELETE SET NULL,
  matched_at TIMESTAMPTZ,
  safe_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS surplus_status_idx ON surplus_batches(status);
