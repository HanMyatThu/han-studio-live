import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "./db";

export const PAYMENT_METHODS = [
  { code: "KBZPAY", name: "KBZPay", color: "#0a4ea3" },
  { code: "WAVEPAY", name: "WavePay", color: "#ffd400" },
  { code: "AYAPAY", name: "AYA Pay", color: "#e3262b" },
  { code: "MPU", name: "MPU Card", color: "#1d9a57" },
] as const;

/**
 * Mock payment provider. Swap for Dinger / 2C2P later: create a checkout,
 * redirect the user, then confirm in a webhook and call activatePass().
 */
export async function mockCheckout(userId: string, planCode: string, method: string) {
  const plan = await db.plan.findUnique({ where: { code: planCode } });
  if (!plan) throw new Error("Unknown plan");
  const payment = await db.payment.create({
    data: {
      userId,
      planCode,
      amountMmk: plan.priceMmk,
      method,
      provider: process.env.PAYMENT_PROVIDER || "mock",
      status: "PAID",
      reference: `ZAT-${randomBytes(4).toString("hex").toUpperCase()}`,
    },
  });
  await activatePass(userId, plan.id, plan.days);
  return payment;
}

/** Extend the user's pass. A new pass starts when the current one ends. */
export async function activatePass(userId: string, planId: string, days: number) {
  const current = await db.subscription.findFirst({
    where: { userId, endsAt: { gt: new Date() } },
    orderBy: { endsAt: "desc" },
  });
  const startsAt = current ? current.endsAt : new Date();
  const endsAt = new Date(startsAt.getTime() + days * 86_400_000);
  return db.subscription.create({ data: { userId, planId, startsAt, endsAt } });
}
