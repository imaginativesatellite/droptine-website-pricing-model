/**
 * Seeds / refreshes the first admin from SEED_ADMIN_* env vars.
 *
 * Upserts on each deploy so the password in Railway is always authoritative
 * (there's no in-app password change yet). Once account management exists, this
 * should be guarded to run only when no users exist.
 *   npm run db:seed
 */
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "david@luna-creative.com").trim().toLowerCase();
  const name = process.env.SEED_ADMIN_NAME ?? "David";
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password) {
    console.log("SEED_ADMIN_PASSWORD not set — skipping admin seed.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role: Role.ADMIN },
    create: { email, name, passwordHash, role: Role.ADMIN },
  });
  console.log(`Seeded/updated admin: ${user.email} (password set from SEED_ADMIN_PASSWORD)`);
}

main()
  .catch((e) => {
    console.error("SEED ERROR:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
