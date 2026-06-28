-- Contact person for a client (captured in the client portal alongside the
-- existing email/phone). The business name stays in Client.name.
ALTER TABLE "Client" ADD COLUMN     "contactName" TEXT;
