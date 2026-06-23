-- Accelerated turnaround (business days) requested via the rush option; set
-- only when a rush fee was applied to the quote.
ALTER TABLE "Quote" ADD COLUMN "rushDays" INTEGER;
