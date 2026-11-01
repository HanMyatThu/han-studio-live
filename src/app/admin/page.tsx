import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Users, Crown, Eye, Film, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { compact, kyat } from "@/lib/format";
import { JobStatusBadge } from "@/components/admin/job-badge";

export default async function AdminDashboard() {
  const t = await getTranslations("admin");
  const now = new Date();
  const [users, passes, views, episodes, revenue, jobs, payments] = await Promise.all([
    db.user.count(),
    db.subscription.count({ where: { endsAt: { gt: now } } }),
    db.drama.aggregate({ _sum: { views: true } }),
    db.episode.count(),
    db.payment.aggregate({ _sum: { amountMmk: true }, where: { status: "PAID" } }),
    db.processingJob.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { drama: { select: { title: true, id: true } } } }),
    db.payment.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { user: { select: { email: true } } } }),
  ]);
  const stats = [
    { label: t("revenue"), value: `${kyat(revenue._sum.amountMmk ?? 0)} Ks`, icon: Wallet, color: "#ffb547" },
    { label: t("activePasses"), value: String(passes), icon: Crown, color: "#ff3d81" },
    { label: t("users"), value: String(users), icon: Users, color: "#8b5cf6" },
    { label: t("totalViews"), value: compact(views._sum.views ?? 0), icon: Eye, color: "#22d3ee" },
    { label: t("episodesCount"), value: String(episodes), icon: Film, color: "#34d399" },
  ];
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">{t("dashboard")}</h1>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="glass relative overflow-hidden rounded-2xl p-5">
            <div className="absolute -right-6 -top-6 size-24 rounded-full opacity-25 blur-2xl" style={{ background: s.color }} />
            <s.icon className="size-5" style={{ color: s.color }} />
            <div className="font-display mt-3 text-2xl font-extrabold">{s.value}</div>
            <div className="text-xs text-white/50">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h2 className="font-semibold">{t("recentJobs")}</h2>
          <ul className="mt-3 divide-y divide-white/5">
            {jobs.length === 0 && <li className="py-3 text-sm text-white/40">—</li>}
            {jobs.map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <Link href={`/admin/dramas/${j.drama.id}`} className="min-w-0 truncate hover:underline">{j.drama.title}<span className="block truncate text-xs text-white/40">{j.step}</span></Link>
                <JobStatusBadge status={j.status} />
              </li>
            ))}
          </ul>
        </div>
        <div className="glass rounded-2xl p-5">
          <h2 className="font-semibold">{t("revenue")}</h2>
          <ul className="mt-3 divide-y divide-white/5">
            {payments.length === 0 && <li className="py-3 text-sm text-white/40">—</li>}
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3 text-sm">
                <span className="min-w-0 truncate">{p.user.email}<span className="block text-xs text-white/40">{p.planCode} · {p.method} · {p.createdAt.toLocaleDateString()}</span></span>
                <span className="font-semibold text-amber-glow">+{kyat(p.amountMmk)} Ks</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
