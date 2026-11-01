"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { mockCheckout } from "@/lib/payments";

export async function toggleFavorite(dramaId: string) {
  const user = await getCurrentUser();
  if (!user) return { needLogin: true as const };
  const key = { userId_dramaId: { userId: user.id, dramaId } };
  const existing = await db.favorite.findUnique({ where: key });
  if (existing) await db.favorite.delete({ where: key });
  else await db.favorite.create({ data: { userId: user.id, dramaId } });
  revalidatePath("/account");
  return { favorite: !existing };
}

export async function saveProgress(episodeId: string, positionSec: number) {
  const user = await getCurrentUser();
  if (!user) return;
  await db.watchProgress.upsert({
    where: { userId_episodeId: { userId: user.id, episodeId } },
    update: { positionSec },
    create: { userId: user.id, episodeId, positionSec },
  });
}

export async function countView(dramaId: string) {
  await db.drama.update({ where: { id: dramaId }, data: { views: { increment: 1 } } });
}

export async function buyPass(planCode: string, method: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "login" as const };
  // Simulated wallet delay so the UI feels like a real payment.
  await new Promise((r) => setTimeout(r, 1400));
  const payment = await mockCheckout(user.id, planCode, method);
  const sub = await db.subscription.findFirst({ where: { userId: user.id }, orderBy: { endsAt: "desc" } });
  revalidatePath("/", "layout");
  return { reference: payment.reference, endsAt: sub?.endsAt.toISOString() };
}
