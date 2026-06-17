/**
 * Seeds the first admin account from SEED_ADMIN_* env vars.
 * Create-only: if the admin already exists, it is left untouched (so a changed
 * password is never clobbered on redeploy). Skips quietly if no password is set.
 *   npm run db:seed
 */
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "david@luna-creative.com").toLowerCase();
  const name = process.env.SEED_ADMIN_NAME ?? "David";
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password) {
    console.log("SEED_ADMIN_PASSWORD not set — skipping admin seed.");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} already exists — leaving as-is.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, name, passwordHash, role: Role.ADMIN },
  });
  console.log(`Seeded admin: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
