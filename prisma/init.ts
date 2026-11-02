/**
 * Production setup: creates the VIP plans and the admin account only (no demo dramas).
 * Safe to run on every start. Run: npm run db:init
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const plans = [
    { code: "WEEK", name: "Weekly Pass", days: 7, priceMmk: 3000, highlight: false },
    { code: "MONTH", name: "Monthly Pass", days: 30, priceMmk: 9900, highlight: true },
    { code: "QUARTER", name: "3-Month Pass", days: 90, priceMmk: 24900, highlight: false },
  ];
  for (const p of plans) await db.plan.upsert({ where: { code: p.code }, update: {}, create: p });

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password === "admin1234") {
    console.warn("ADMIN_EMAIL / ADMIN_PASSWORD not set (or still the demo password). Skipping admin account.");
    return;
  }
  const existing = await db.user.findUnique({ where: { email } });
  if (!existing) {
    await db.user.create({ data: { email, name: "Admin", role: "ADMIN", passwordHash: await bcrypt.hash(password, 10) } });
    console.log(`Admin account created: ${email}`);
  }
}

main().finally(() => db.$disconnect());
