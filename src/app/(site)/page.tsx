import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Crown, ArrowRight, Film } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/access";
import { getContinueWatching, getPublishedDramas, GENRES } from "@/lib/queries";
import { kyat, localized } from "@/lib/format";
import { mediaUrl } from "@/lib/format";
import { Hero, type HeroItem } from "@/components/hero";
import { DramaCard } from "@/components/drama-card";
import { DramaRow } from "@/components/drama-row";
import { TopTen } from "@/components/top-ten";
import { AdSlot } from "@/components/ad-slot";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [t, tg, locale, user] = await Promise.all([getTranslations("home"), getTranslations("genres"), getLocale(), getCurrentUser()]);
  const [all, newest, sub, cheapest] = await Promise.all([
    getPublishedDramas(),
    getPublishedDramas({ orderBy: "new", take: 12 }),
    getActiveSubscription(user?.id),
    db.plan.findFirst({ orderBy: { priceMmk: "asc" } }),
  ]);
  const continueWatching = user ? await getContinueWatching(user.id) : [];

  if (all.length === 0) {
    return (
      <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 pt-24 text-center">
        <div>
          <Film className="mx-auto size-12 text-white/30" />
          <h1 className="font-display mt-4 text-2xl font-bold">{t("emptyTitle")}</h1>
          <p className="mt-2 text-white/50">{t("emptyBody")}</p>
        </div>
      </div>
    );
  }

  const featured = (all.filter((d) => d.featured).length ? all.filter((d) => d.featured) : all).slice(0, 5);
  const heroItems: HeroItem[] = featured.map((d) => ({
    slug: d.slug,
    title: localized(locale, d.title, d.titleMy),
    synopsis: localized(locale, d.synopsis, d.synopsisMy),
    genre: tg.has(d.genre) ? tg(d.genre) : d.genre,
    accent: d.accent,
    posterUrl: d.posterUrl,
    previewUrl: mediaUrl(d.previewKey),
    episodes: d._count.episodes,
    freeEpisodes: d.freeEpisodes,
    tags: "",
  }));
  const genresWithDramas = GENRES.filter((g) => all.some((d) => d.genre === g));

  return (
    <div className="space-y-12">
      <Hero items={heroItems} />

      <div className="relative z-10 -mt-10 space-y-12">
        {continueWatching.length > 0 && (
          <DramaRow title={t("continueWatching")}>
            {continueWatching.map((c) => (
              <DramaCard key={c.drama.id} drama={c.drama} progress={c.progress} episodeNumber={c.episodeNumber} />
            ))}
          </DramaRow>
        )}

        <DramaRow title={t("top10")} href="/browse">
          <TopTen dramas={all} />
        </DramaRow>

        {!sub && (
          <div className="px-4 md:px-8">
            <Link
              href="/subscribe"
              className="group relative mx-auto flex max-w-7xl flex-col items-start gap-4 overflow-hidden rounded-3xl p-6 ring-1 ring-white/10 sm:flex-row sm:items-center md:p-8"
            >
              <div className="absolute inset-0 -z-10 bg-[radial-gradient(80%_120%_at_0%_0%,#ff3d8155,transparent_60%),radial-gradient(60%_120%_at_100%_100%,#ffb54744,transparent_60%)]" />
              <div className="grain absolute inset-0 -z-10 bg-ink-900/60" />
              <div className="bg-gradient-brand grid size-14 shrink-0 place-items-center rounded-2xl shadow-[0_10px_40px_-10px_#ff3d81]">
                <Crown className="size-7" />
              </div>
              <div className="flex-1">
                <div className="font-display text-xl font-bold md:text-2xl">{t("vipTitle")}</div>
                <div className="mt-1 text-white/60">{t("vipBody", { price: kyat(cheapest?.priceMmk ?? 3000) })}</div>
              </div>
              <span className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-ink-950 transition group-hover:gap-3">
                {t("vipCta")} <ArrowRight className="size-4" />
              </span>
            </Link>
          </div>
        )}

        <DramaRow title={t("trending")} href="/browse">
          {all.slice(0, 12).map((d) => <DramaCard key={d.id} drama={d} />)}
        </DramaRow>

        {!sub && (
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <AdSlot slot="home-mid" />
          </div>
        )}

        <DramaRow title={t("newReleases")} href="/browse">
          {newest.map((d) => <DramaCard key={d.id} drama={d} />)}
        </DramaRow>

        <section className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="font-display mb-3 text-lg font-bold tracking-tight md:text-xl">{t("genres")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {GENRES.map((g, i) => {
              const sample = all.find((d) => d.genre === g);
              const accent = sample?.accent ?? ["#ff3d81", "#ffb547", "#8b5cf6", "#22d3ee", "#34d399", "#f97316", "#facc15"][i % 7];
              return (
                <Link
                  key={g}
                  href={`/browse?genre=${g}`}
                  className="group relative overflow-hidden rounded-2xl p-4 ring-1 ring-white/10 transition duration-300 hover:-translate-y-0.5 hover:ring-white/30"
                  style={{ background: `linear-gradient(135deg, ${accent}40, transparent 70%)` }}
                >
                  <div className="absolute -bottom-6 -right-6 size-20 rounded-full opacity-40 blur-xl transition group-hover:opacity-80" style={{ background: accent }} />
                  <div className="font-display relative text-base font-bold">{tg(g)}</div>
                  <div className="relative mt-6 text-xs text-white/50">{t("dramasCount", { count: all.filter((d) => d.genre === g).length })}</div>
                </Link>
              );
            })}
          </div>
        </section>

        {genresWithDramas.filter((g) => all.filter((d) => d.genre === g).length >= 3).map((g) => (
          <DramaRow key={g} title={t("becauseGenre", { genre: tg(g) })} href={`/browse?genre=${g}`}>
            {all.filter((d) => d.genre === g).map((d) => <DramaCard key={d.id} drama={d} />)}
          </DramaRow>
        ))}
      </div>
    </div>
  );
}
