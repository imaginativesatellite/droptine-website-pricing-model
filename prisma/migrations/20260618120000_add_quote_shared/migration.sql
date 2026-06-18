-- Add per-quote visibility flag (private by default, shareable to everyone)
ALTER TABLE "Quote" ADD COLUMN "shared" BOOLEAN NOT NULL DEFAULT false;
