-- Manual turnaround override (business days) for custom-quote approvals
ALTER TABLE "Quote" ADD COLUMN "leadDaysOverride" INTEGER;
