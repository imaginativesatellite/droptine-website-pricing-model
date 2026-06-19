-- Existing quotes were all stamped private by the add-shared migration.
-- Staff-created quotes should be viewable to everyone (the default going forward).
UPDATE "Quote" SET "shared" = true
WHERE "createdById" IN (SELECT "id" FROM "User" WHERE "role" = 'STAFF');
