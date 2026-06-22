-- Add an on/off switch to each transactional email. Existing rows keep sending.
ALTER TABLE "EmailTemplate" ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;
