import { getTranslations } from "next-intl/server";
import { Crown } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/access";
import { PAYMENT_METHODS } from "@/lib/payments";
import { Checkout } from "@/components/checkout";

export const metadata = { title: "VIP Pass" };

export default async function SubscribePage() {
  const t = await getTranslations("subscribe");
  const user = await getCurrentUser();
  const [plans, sub] = await Promise.all([db.plan.findMany({ orderBy: { days: "asc" } }), getActiveSubscription(user?.id)]);
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[600px]">
        <div className="animate-aurora absolute left-1/2 top-0 size-[700px] -translate-x-1/2 rounded-full bg-[conic-gradient(from_0deg,#ff3d81,#ffb547,#8b5cf6,#ff3d81)] opacity-25 blur-3xl" />
      </div>
      <div className="mx-auto max-w-5xl px-4 pt-28 text-center md:px-8 md:pt-32">
        <div className="bg-gradient-brand mx-auto grid size-16 place-items-center rounded-2xl shadow-[0_10px_50px_-10px_#ff3d81]">
          <Crown className="size-8" />
        </div>
        <h1 className="font-display mt-6 text-4xl font-extrabold tracking-tight md:text-6xl">
          <span className="text-gradient">{t("title")}</span>
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-white/60">{t("subtitle")}</p>
        {sub && <p className="mx-auto mt-4 max-w-lg rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">{t("activeUntil", { date: sub.endsAt.toLocaleDateString() })}</p>}
      </div>
      <Checkout
        plans={plans.map((p) => ({ code: p.code, name: p.name, days: p.days, priceMmk: p.priceMmk, highlight: p.highlight }))}
        methods={PAYMENT_METHODS.map((m) => ({ ...m }))}
        loggedIn={!!user}
      />
    </div>
  );
}
