-- ==========================================
-- FixGo Database Schema
-- ==========================================

-- Users table (both clients and masters)
CREATE TABLE IF NOT EXISTS users (
  id         BIGINT PRIMARY KEY,          -- Telegram user_id
  username   VARCHAR(255),
  full_name  VARCHAR(255) NOT NULL,
  phone      VARCHAR(20),
  role       VARCHAR(10) CHECK (role IN ('client', 'master')) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscriptions table (masters only)
CREATE TABLE IF NOT EXISTS subscriptions (
  id              SERIAL PRIMARY KEY,
  master_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  plan            VARCHAR(20) NOT NULL DEFAULT 'monthly',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  payment_method  VARCHAR(20) NOT NULL DEFAULT 'mock' CHECK (payment_method IN ('mock', 'telegram_stars', 'telegram_payments')),
  payment_ref     VARCHAR(255),                   -- transaction id / charge_id
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_master_id ON subscriptions(master_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_expires ON subscriptions(status, expires_at);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id            SERIAL PRIMARY KEY,
  client_id     BIGINT NOT NULL REFERENCES users(id),
  master_id     BIGINT REFERENCES users(id),          -- NULL until taken
  category      VARCHAR(50) NOT NULL CHECK (category IN ('plumbing', 'electrical', 'other')),
  description   TEXT NOT NULL,
  price_type    VARCHAR(10) NOT NULL CHECK (price_type IN ('fixed', 'negotiable')),
  price         NUMERIC(10, 2),                       -- NULL when negotiable
  status        VARCHAR(20) NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'taken', 'in_progress', 'done', 'cancelled')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_master_id ON orders(master_id);

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
