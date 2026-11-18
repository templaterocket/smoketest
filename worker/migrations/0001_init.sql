-- Smoketest leads database (Cloudflare D1). Apply with:
--   npx wrangler d1 migrations apply smoketest-leads --local     (development)
--   npx wrangler d1 migrations apply smoketest-leads --remote    (production)

-- One row per email. A signup is `pending` until the email link is clicked (double opt-in),
-- then `confirmed`; `unsubscribed` keeps the row so the address is not re-added silently.
CREATE TABLE leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT,
  message TEXT,
  cta TEXT NOT NULL,
  answers TEXT NOT NULL DEFAULT '{}',
  utm TEXT NOT NULL DEFAULT '{}',
  page TEXT,
  referrer TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
  confirm_token TEXT UNIQUE,
  unsubscribe_token TEXT NOT NULL UNIQUE,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by INTEGER REFERENCES leads (id) ON DELETE SET NULL,
  referrals_credited INTEGER NOT NULL DEFAULT 0,
  consent TEXT NOT NULL,
  -- HMAC of the IP, kept for abuse checks and cleared after IP_HASH_RETENTION_DAYS.
  ip_hash TEXT,
  email_attempts INTEGER NOT NULL DEFAULT 0,
  email_sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at TEXT
);
CREATE INDEX leads_status ON leads (status);
CREATE INDEX leads_referred_by ON leads (referred_by);

-- Fake-door clicks: one per plan, visitor and day.
CREATE TABLE intents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan TEXT NOT NULL,
  page TEXT,
  ip_hash TEXT,
  day TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (plan, ip_hash, day)
);

-- Submissions per IP hash and route, for rate limiting; pruned daily.
CREATE TABLE attempts (
  ip_hash TEXT NOT NULL,
  route TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX attempts_ip ON attempts (ip_hash, route, created_at);

-- Data subject requests (export, delete, unsubscribe), verified by an emailed link.
CREATE TABLE data_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL COLLATE NOCASE,
  kind TEXT NOT NULL CHECK (kind IN ('export', 'delete', 'unsubscribe')),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  done_at TEXT
);
