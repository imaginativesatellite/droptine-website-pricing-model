ALTER TABLE "Quote" ADD COLUMN "disclaimers" JSONB;
ALTER TABLE "Quote" ADD COLUMN "priceReason" TEXT;

-- Backfill the new multi-disclaimer array from the old single disclaimer
-- fields so existing quotes don't lose their disclaimer text.
UPDATE "Quote"
SET "disclaimers" = jsonb_build_array(
  jsonb_build_object(
    'text', "customDisclaimer",
    'placement', COALESCE("customDisclaimerPlacement", 'development')
  )
)
WHERE "customDisclaimer" IS NOT NULL AND "customDisclaimer" <> '';

ALTER TABLE "Quote" DROP COLUMN "customDisclaimer";
ALTER TABLE "Quote" DROP COLUMN "customDisclaimerPlacement";
