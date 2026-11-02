/**
 * Create an admin or reset an admin's password.
 * Server: docker compose exec app npm run admin:reset -- you@example.com 'NewPassword'
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const [emailArg, password] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();
if (!email || !password || password.length < 8) {
  console.error("Usage: npm run admin:reset -- you@example.com 'NewPassword' (8+ characters)");
  process.exit(1);
}
const db = new PrismaClient();
bcrypt
  .hash(password, 10)
  .then((passwordHash) =>
    db.user.upsert({
      where: { email },
      update: { passwordHash, role: "ADMIN", banned: false },
      create: { email, name: "Admin", role: "ADMIN", passwordHash },
    }),
  )
  .then((u) => console.log(`Admin ready: ${u.email}`))
  .finally(() => db.$disconnect());
