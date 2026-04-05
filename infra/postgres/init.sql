-- ── Postgres init script — runs once on first container start ────────────────
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Read-only role for analytics / BI tools
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'adzy_readonly') THEN
        CREATE ROLE adzy_readonly WITH LOGIN PASSWORD 'adzy_readonly_password' NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;
END
$$;

GRANT CONNECT ON DATABASE adzy TO adzy_readonly;
GRANT USAGE ON SCHEMA public TO adzy_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO adzy_readonly;
