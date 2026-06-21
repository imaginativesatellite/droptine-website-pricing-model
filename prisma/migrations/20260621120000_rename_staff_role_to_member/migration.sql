-- Rename the STAFF role to MEMBER.
--
-- ALTER TYPE ... RENAME VALUE renames the enum label in place: it's the same
-- underlying enum element, so every existing User row that was 'STAFF' now reads
-- as 'MEMBER', and the column default (DEFAULT 'STAFF') is carried over to
-- 'MEMBER' automatically. No data backfill and no enum drop/recreate needed.
ALTER TYPE "Role" RENAME VALUE 'STAFF' TO 'MEMBER';
