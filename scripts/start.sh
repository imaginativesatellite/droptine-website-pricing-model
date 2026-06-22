#!/bin/sh
# Railway start command. Applies database migrations and seeds the first admin
# (both best-effort), then starts Next.js. The app still boots in preview-only
# mode even if the DB isn't connected yet.

if [ -n "$DATABASE_URL" ]; then
  echo "Applying database migrations..."
  # Baseline an existing (db push-created) database the first time. This records
  # the initial migration as already-applied without re-running it. It's a no-op
  # (and harmlessly errors) on subsequent deploys once recorded.
  npx prisma migrate resolve --applied 0_init 2>/dev/null || true
  # 20260622120000_email_template_enabled failed once in production and Prisma
  # now blocks every later migration until that failed record is cleared
  # (P3009). Its migration.sql is a single ALTER TABLE statement, which
  # Postgres runs as one transaction, so a failed run can't have left the
  # column half-added - it's safe to tell Prisma it never took and let
  # migrate deploy below retry it cleanly. No-op once it's no longer failed.
  npx prisma migrate resolve --rolled-back 20260622120000_email_template_enabled 2>/dev/null || true
  npx prisma migrate deploy || echo "WARN: prisma migrate deploy failed; continuing."

  echo "Seeding admin (if needed)..."
  npx tsx prisma/seed.ts || echo "WARN: seed step skipped/failed; continuing."
else
  echo "No DATABASE_URL set - skipping migrations (preview-only mode)."
fi

exec npx next start -p "${PORT:-3000}"
