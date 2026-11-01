import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Crown, LogOut, Receipt } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/access";
import { dramaCardSelect } from "@/lib/queries";
import { kyat } from "@/lib/format";
import { logout } from "@/app/actions/auth";
import { DramaCard } from "@/components/drama-card";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const t = await getTranslations("account");
  const tn = await getTranslations("nav");
  const [sub, payments, favorites] = await Promise.all([
    getActiveSubscription(user.id),
    db.payment.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.favorite.findMany({ where: { userId: user.id }, include: { drama: { select: dramaCardSelect } }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-24 md:px-8 md:pt-28">
      <div className="flex items-center gap-4">
        <div className="bg-gradient-brand grid size-16 place-items-center rounded-2xl font-display text-2xl font-extrabold">{user.name.slice(0, 1).toUpperCase()}</div>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-extrabold">{user.name}</h1>
          <p className="text-sm text-white/50">{user.email}</p>
        </div>
        <form action={logout}>
          <button className="glass flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"><LogOut className="size-4" />{tn("logout")}</button>
        </form>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-3xl p-6 ring-1 ring-white/10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(100%_100%_at_0%_0%,#ffb54733,transparent_60%)]" />
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-glow"><Crown className="size-4" /> {t("pass")}</div>
          {sub ? (
            <>
              <div className="font-display mt-3 text-2xl font-extrabold">{sub.plan.name}</div>
              <div className="text-sm text-white/60">{t("activeUntil", { date: sub.endsAt.toLocaleDateString() })}</div>
            </>
          ) : (
            <>
              <p className="mt-3 text-white/60">{t("noPass")}</p>
              <Link href="/subscribe" className="bg-gradient-brand mt-4 inline-block rounded-full px-5 py-2.5 text-sm font-bold">{tn("subscribe")}</Link>
            </>
          )}
        </div>
        <div className="glass rounded-3xl p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/70"><Receipt className="size-4" /> {t("payments")}</div>
          {payments.length === 0 ? (
            <p className="mt-3 text-sm text-white/50">{t("noPayments")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-white/5 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2">
                  <span>{p.planCode} · {p.method}<span className="block font-mono text-[11px] text-white/35">{p.reference}</span></span>
                  <span className="font-semibold">{kyat(p.amountMmk)} Ks</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <section id="list" className="mt-12 scroll-mt-24">
        <h2 className="font-display text-xl font-bold">{t("myList")}</h2>
        {favorites.length === 0 ? (
          <p className="mt-3 text-white/50">{t("emptyList")}</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-5 [&>a]:w-auto">
            {favorites.map((f) => <DramaCard key={f.dramaId} drama={f.drama} />)}
          </div>
        )}
      </section>
    </div>
  );
}
