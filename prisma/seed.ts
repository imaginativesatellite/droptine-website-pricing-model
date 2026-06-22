/**
 * Seeds the first admin from SEED_ADMIN_* env vars - create-only.
 *
 * If the admin already exists it is left untouched, so passwords changed in-app
 * (or member accounts) survive redeploys. To force a password reset, delete the
 * user first or change it from the in-app account screen.
 *   npm run db:seed
 */
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { TEMPLATE_MAP, type TemplateKey } from "../src/lib/email-templates";

const prisma = new PrismaClient();

async function seedAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "david@luna-creative.com").trim().toLowerCase();
  const name = process.env.SEED_ADMIN_NAME ?? "David";
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password) {
    console.log("SEED_ADMIN_PASSWORD not set - skipping admin seed.");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} already exists - leaving as-is.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, name, passwordHash, role: Role.ADMIN },
  });
  console.log(`Seeded admin: ${user.email}`);
}

// One-time defaults requested directly (the admin Emails tab's on/off toggle
// was broken while the `enabled` column's migration was stuck - see start.sh).
// Create-only: an admin's later choice from the Emails tab always wins, this
// only sets the initial state the first time each row is created.
const DEFAULT_DISABLED: TemplateKey[] = ["proposal_to_member", "client_signed", "proposal_fully_signed"];

async function seedDisabledEmailDefaults() {
  for (const key of DEFAULT_DISABLED) {
    const existing = await prisma.emailTemplate.findUnique({ where: { key } });
    if (existing) continue;
    const def = TEMPLATE_MAP[key];
    await prisma.emailTemplate.create({
      data: { key, subject: def.subject, body: def.body, enabled: false },
    });
    console.log(`Disabled email by default: ${key}`);
  }
}

async function main() {
  await seedAdmin();
  await seedDisabledEmailDefaults();
}

main()
  .catch((e) => {
    console.error("SEED ERROR:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
