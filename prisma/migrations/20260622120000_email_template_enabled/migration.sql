-- EmailTemplate was added to schema.prisma (commit 7baeac2) without a
-- matching migration ever being generated, so production never had this
-- table - this migration's original "ALTER TABLE ... ADD COLUMN enabled"
-- failed every time with "relation EmailTemplate does not exist" (P3018).
-- Safe to fold the missing CREATE TABLE in here since this migration has
-- never successfully applied anywhere (every prior attempt failed/rolled
-- back, per start.sh's resolve step).
CREATE TABLE "EmailTemplate" (
    "key" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("key")
);
