import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { compact } from "@/lib/format";
import { Poster } from "@/components/poster";
import { DeleteDramaButton } from "@/components/admin/delete-drama-button";
import { MissingArtworkButton } from "@/components/admin/missing-artwork-button";

export default async function AdminDramas() {
  const t = await getTranslations("admin");
  const dramas = await db.drama.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { episodes: true } }, episodes: { where: { status: "REVIEW" }, select: { id: true } } },
  });
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{t("dramas")}</h1>
        <div className="flex items-center gap-2">
          <MissingArtworkButton />
          <Link href="/admin/dramas/new" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-ink-950">+ {t("newDrama")}</Link>
        </div>
      </div>
      <div className="mt-6 grid gap-3">
        {dramas.map((d) => (
          <div key={d.id} className="glass group flex items-center gap-2 rounded-2xl p-3 pr-3 transition hover:bg-white/[0.07]">
          <Link href={`/admin/dramas/${d.id}`} className="flex min-w-0 flex-1 items-center gap-4">
            <div className="aspect-[2/3] w-14 shrink-0 overflow-hidden rounded-lg">
              <Poster title={d.title} accent={d.accent} posterUrl={d.posterUrl} size="sm" className="h-full w-full" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{d.title}</div>
              <div className="text-xs text-white/45">{d.genre} · {d._count.episodes} eps · {compact(d.views)} views</div>
            </div>
            {d.episodes.length > 0 && <span className="rounded-full bg-amber-glow/15 px-2.5 py-1 text-[11px] font-bold text-amber-glow">{d.episodes.length} {t("review")}</span>}
            <span className={d.published ? "rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300" : "rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white/50"}>
              {d.published ? t("published") : t("draft")}
            </span>
          </Link>
          <DeleteDramaButton id={d.id} title={d.title} episodes={d._count.episodes} />
          </div>
        ))}
      </div>
    </div>
  );
}
