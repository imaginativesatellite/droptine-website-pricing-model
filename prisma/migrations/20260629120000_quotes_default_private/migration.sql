-- Per-member default visibility for new quotes (admins set it on the Users tab;
-- the creator can still override per quote).
ALTER TABLE "User" ADD COLUMN     "quotesDefaultPrivate" BOOLEAN NOT NULL DEFAULT false;

-- Preserve existing behavior: admins and portal (pilot) members defaulted to
-- private; everyone else defaulted to shared.
UPDATE "User" SET "quotesDefaultPrivate" = true WHERE "role" = 'ADMIN' OR "clientPortalEnabled" = true;
