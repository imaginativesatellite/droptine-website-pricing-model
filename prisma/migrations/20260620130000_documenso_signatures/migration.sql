-- Replace single-party DocuSeal signature tracking with two-party Documenso
-- tracking: separate client/company signing tokens and signed timestamps,
-- plus which admin completed the shared company signature.
DROP INDEX "Quote_signatureSubmissionId_idx";

ALTER TABLE "Quote" DROP COLUMN "signatureSubmissionId";
ALTER TABLE "Quote" DROP COLUMN "signatureSignedAt";

ALTER TABLE "Quote" ADD COLUMN "signatureEnvelopeId" TEXT;
ALTER TABLE "Quote" ADD COLUMN "clientSigningToken" TEXT;
ALTER TABLE "Quote" ADD COLUMN "clientSignedAt" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN "companySigningToken" TEXT;
ALTER TABLE "Quote" ADD COLUMN "companySignedAt" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN "companySignedById" TEXT;
ALTER TABLE "Quote" ADD COLUMN "companySignedByName" TEXT;

ALTER TABLE "Quote" ADD CONSTRAINT "Quote_companySignedById_fkey" FOREIGN KEY ("companySignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Quote_signatureEnvelopeId_idx" ON "Quote"("signatureEnvelopeId");
CREATE INDEX "Quote_companySignedById_idx" ON "Quote"("companySignedById");
