#!/usr/bin/env bash
# Deploys the database: applies pending migrations, then aligns the raid reference data.
# Usage: tools/deploy-database.sh <postgres connection url>
# Needs the Supabase CLI and psql. Shared by CI (throwaway Postgres) and the deploy workflow.
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <postgres connection url>" >&2
  exit 1
fi
readonly database_url="$1"

supabase db push --db-url "$database_url" --yes
npm run --silent generate
psql "$database_url" --quiet -v ON_ERROR_STOP=1 -f dist/generated/database/raid-data.sql
echo "Database deployed."
