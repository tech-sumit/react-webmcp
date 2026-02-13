-- PostgreSQL Initialization Script
-- Runs on first database creation only (via docker-entrypoint-initdb.d)
--
-- NOTE: The database and user are created automatically by the postgres image
-- via POSTGRES_DB and POSTGRES_USER environment variables. This script only
-- adds extensions. The GRANT below uses defaults; if you change POSTGRES_DB
-- or POSTGRES_USER from 'n8n', update this file accordingly.

-- Create extensions commonly used by n8n
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone as database default
ALTER DATABASE n8n SET timezone TO 'UTC';
