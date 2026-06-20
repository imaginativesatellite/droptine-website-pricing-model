ALTER TABLE "Quote" ADD COLUMN "signatureStatus" TEXT;
ALTER TABLE "Quote" ADD COLUMN "signatureSubmissionId" TEXT;
ALTER TABLE "Quote" ADD COLUMN "signatureSentAt" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN "signatureSignedAt" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN "signedDocumentUrl" TEXT;
ALTER TABLE "Quote" ADD COLUMN "signatureMeta" JSONB;

CREATE INDEX "Quote_signatureSubmissionId_idx" ON "Quote"("signatureSubmissionId");
