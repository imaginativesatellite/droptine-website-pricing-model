-- Client-facing Presentation Mode (Phase 0): per-member access flag + markup
-- settings on User, and quote origin / client-pricing snapshot on Quote.

-- CreateEnum
CREATE TYPE "QuoteOrigin" AS ENUM ('LUNA_REQUEST', 'CLIENT');

-- AlterTable: User access flag + markup settings
ALTER TABLE "User" ADD COLUMN     "clientPortalEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "markupWebsite" INTEGER NOT NULL DEFAULT 5000,
ADD COLUMN     "markupWebsiteIsPercent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "markupMonthly" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "markupIncrement" INTEGER NOT NULL DEFAULT 500;

-- AlterTable: Quote origin + client-pricing snapshot
ALTER TABLE "Quote" ADD COLUMN     "origin" "QuoteOrigin" NOT NULL DEFAULT 'LUNA_REQUEST',
ADD COLUMN     "convertedToLunaAt" TIMESTAMP(3),
ADD COLUMN     "clientPricing" JSONB;

-- CreateIndex
CREATE INDEX "Quote_origin_idx" ON "Quote"("origin");
