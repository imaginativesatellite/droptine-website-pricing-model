-- Separate, hard-to-guess public code for the public proposal URL
ALTER TABLE "Quote" ADD COLUMN "publicCode" TEXT;
UPDATE "Quote" SET "publicCode" = substr(md5(random()::text || "id"), 1, 15) WHERE "publicCode" IS NULL;
ALTER TABLE "Quote" ALTER COLUMN "publicCode" SET NOT NULL;
CREATE UNIQUE INDEX "Quote_publicCode_key" ON "Quote"("publicCode");
