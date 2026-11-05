CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS markets (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  address VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  brand VARCHAR(100),
  category VARCHAR(100) NOT NULL,
  unit VARCHAR(5) NOT NULL CHECK (unit IN ('un', 'g', 'kg', 'ml', 'l')),
  size DOUBLE PRECISION NOT NULL CHECK (size > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS market_prices (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  market_id BIGINT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  is_promotion BOOLEAN NOT NULL DEFAULT FALSE,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  source VARCHAR(20) NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'test', 'user', 'integration')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_prices_lookup
  ON market_prices (market_id, product_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS shopping_lists (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shopping_list_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  list_id BIGINT NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  is_purchased BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (list_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_shopping_lists_user ON shopping_lists (user_id);

CREATE TABLE IF NOT EXISTS user_favorite_markets (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id BIGINT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, market_id)
);

CREATE TABLE IF NOT EXISTS user_selected_markets (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id BIGINT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, market_id)
);

CREATE TABLE IF NOT EXISTS purchases (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id BIGINT NOT NULL REFERENCES markets(id) ON DELETE RESTRICT,
  list_id BIGINT REFERENCES shopping_lists(id) ON DELETE SET NULL,
  purchased_at DATE NOT NULL DEFAULT CURRENT_DATE,
  total_paid NUMERIC(12, 2) NOT NULL CHECK (total_paid >= 0),
  reference_highest_total NUMERIC(12, 2),
  reference_lowest_total NUMERIC(12, 2),
  reference_market_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  purchase_id BIGINT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  UNIQUE (purchase_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_purchases_user_date ON purchases (user_id, purchased_at DESC);

-- Acesso premium: vale enquanto premium_until estiver no futuro
ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;