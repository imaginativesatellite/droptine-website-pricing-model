#!/bin/sh
# Railway start command. Syncs the database schema and seeds the first admin
# (both best-effort), then starts Next.js. The app still boots in preview-only
# mode even if the DB isn't connected yet.

if [ -n "$DATABASE_URL" ]; then
  echo "DATABASE_URL detected — syncing schema with 'prisma db push'..."
  npx prisma db push --skip-generate --accept-data-loss || echo "WARN: prisma db push failed; continuing."
  echo "Seeding admin (if needed)..."
  npx tsx prisma/seed.ts || echo "WARN: seed step skipped/failed; continuing."
else
  echo "No DATABASE_URL set — skipping schema sync (preview-only mode)."
fi

exec npx next start -p "${PORT:-3000}"
