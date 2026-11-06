#!/usr/bin/env bash
set -euo pipefail
[[ "$APP_DATABASE_PASSWORD" =~ ^[a-f0-9]{64}$ ]] || { echo 'Invalid application database password format.' >&2; exit 1; }
# The generated hexadecimal password has no SQL quoting characters. Never enable xtrace here.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" >/dev/null <<SQL
CREATE ROLE portal_egv LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '$APP_DATABASE_PASSWORD';
ALTER DATABASE portal_egv OWNER TO portal_egv;
GRANT USAGE, CREATE ON SCHEMA public TO portal_egv;
SQL
