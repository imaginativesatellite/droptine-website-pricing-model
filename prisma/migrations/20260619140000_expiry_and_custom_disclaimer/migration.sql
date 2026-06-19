ALTER TABLE "Quote" ADD COLUMN "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "Quote" SET "validFrom" = "createdAt";
ALTER TABLE "Quote" ADD COLUMN "customDisclaimer" TEXT;
ALTER TABLE "Quote" ADD COLUMN "customDisclaimerPlacement" TEXT;
