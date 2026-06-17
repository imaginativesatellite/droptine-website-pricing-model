#!/bin/sh
# Railway start command. Syncs the database schema (if a DATABASE_URL is present)
# and then starts the Next.js server. The schema sync is best-effort so the app
# (including the pricing preview) still boots even if the DB isn't connected yet.

if [ -n "$DATABASE_URL" ]; then
  echo "DATABASE_URL detected — syncing schema with 'prisma db push'..."
  npx prisma db push --skip-generate --accept-data-loss || echo "WARN: prisma db push failed; starting app anyway."
else
  echo "No DATABASE_URL set — skipping schema sync (preview-only mode)."
fi

exec npx next start -p "${PORT:-3000}"
