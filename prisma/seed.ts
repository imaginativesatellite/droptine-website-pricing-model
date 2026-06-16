/**
 * Seeds the first admin account from SEED_ADMIN_* env vars.
 * Idempotent: re-running updates the name/password but won't create duplicates.
 *   npm run db:seed
 */
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "david@luna-creative.com";
  const name = process.env.SEED_ADMIN_NAME ?? "David";
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password) {
    throw new Error("Set SEED_ADMIN_PASSWORD before seeding.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role: Role.ADMIN },
    create: { email, name, passwordHash, role: Role.ADMIN },
  });

  console.log(`Seeded admin: ${user.email} (${user.role})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
