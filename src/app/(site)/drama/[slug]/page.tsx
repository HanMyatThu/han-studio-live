import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Play, Lock, Crown, Eye, Captions } from "lucide-react";
import clsx from "clsx";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { episodeAccess, getActiveSubscription } from "@/lib/access";
import { compact, duration, localized } from "@/lib/format";
import { Poster } from "@/components/poster";
import { FavoriteButton } from "@/components/favorite-button";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const drama = await db.drama.findUnique({ where: { slug }, select: { title: true, synopsis: true } });
  return drama ? { title: drama.title, description: drama.synopsis } : {};
}

export default async function DramaPage({ params }: Params) {
  const { slug } = await params;
  const [t, tg, locale, user] = await Promise.all([getTranslations("drama"), getTranslations("genres"), getLocale(), getCurrentUser()]);
  const drama = await db.drama.findUnique({
    where: { slug },
    include: { episodes: { where: { status: "READY" }, orderBy: { number: "asc" }, select: { id: true, number: true, durationSec: true } } },
  });
  if (!drama || (!drama.published && user?.role !== "ADMIN")) notFound();

  const sub = await getActiveSubscription(user?.id);
  const [fav, lastProgress] = user
    ? await Promise.all([
        db.favorite.findUnique({ where: { userId_dramaId: { userId: user.id, dramaId: drama.id } } }),
        db.watchProgress.findFirst({ where: { userId: user.id, episode: { dramaId: drama.id } }, orderBy: { updatedAt: "desc" }, include: { episode: { select: { number: true } } } }),
      ])
    : [null, null];

  const title = localized(locale, drama.title, drama.titleMy);
  const synopsis = localized(locale, drama.synopsis, drama.synopsisMy);
  const resumeAt = lastProgress?.episode.number ?? 1;
  const tags = drama.tags.split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 -z-10 h-[620px] overflow-hidden">
        <div className="absolute inset-0" style={{ background: `radial-gradient(60% 70% at 70% 20%, ${drama.accent}50, transparent 70%)` }} />
        <div className="animate-aurora absolute -left-40 top-0 size-[600px] rounded-full opacity-30 blur-3xl" style={{ background: drama.accent }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink-950/60 to-ink-950" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-24 md:px-8 md:pt-32">
        <div className="flex flex-col gap-8 md:flex-row md:gap-12">
          <div className="mx-auto w-[220px] shrink-0 md:mx-0 md:w-[280px]">
            <div className="relative">
              <div className="absolute -inset-4 -z-10 rounded-[36px] opacity-60 blur-2xl" style={{ background: drama.accent }} />
              <div className="aspect-[2/3] overflow-hidden rounded-3xl ring-1 ring-white/15 shadow-2xl">
                <Poster title={title} accent={drama.accent} posterUrl={drama.posterUrl} genre={drama.genre} size="lg" className="h-full w-full" />
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-full px-2.5 py-1" style={{ background: `${drama.accent}26`, color: drama.accent }}>{tg.has(drama.genre) ? tg(drama.genre) : drama.genre}</span>
              <span className="glass flex items-center gap-1 rounded-full px-2.5 py-1 text-white/70"><Eye className="size-3" />{t("views", { count: compact(drama.views) })}</span>
              <span className="glass flex items-center gap-1 rounded-full px-2.5 py-1 text-white/70"><Captions className="size-3" />မြန်မာ · EN</span>
            </div>
            <h1 className="font-display mt-4 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-white/70 md:text-lg">{synopsis}</p>
            {tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {tags.map((tag) => <span key={tag} className="text-sm text-white/40">#{tag.replace(/\s+/g, "")}</span>)}
              </div>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              {drama.episodes.length > 0 && (
                <Link href={`/watch/${drama.slug}/${resumeAt}`} className="flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-bold text-ink-950 shadow-[0_10px_40px_-10px_rgba(255,255,255,0.5)] transition hover:scale-[1.03]">
                  <Play className="size-5 fill-current" /> {lastProgress ? t("resume", { number: resumeAt }) : t("play", { number: 1 })}
                </Link>
              )}
              <FavoriteButton dramaId={drama.id} initial={!!fav} />
            </div>
          </div>
        </div>

        <section className="mt-16">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="font-display text-2xl font-bold">{t("episodes")} <span className="text-white/40">· {drama.episodes.length}</span></h2>
            {!sub && (
              <Link href="/subscribe" className="flex items-center gap-1.5 text-sm font-semibold text-amber-glow hover:underline">
                <Crown className="size-4" /> VIP
              </Link>
            )}
          </div>
          {drama.episodes.length === 0 ? (
            <p className="text-white/50">{t("noEpisodes")}</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
              {drama.episodes.map((ep) => {
                const access = episodeAccess(ep.number, drama.freeEpisodes, !!sub);
                const current = ep.number === resumeAt && lastProgress;
                return (
                  <Link
                    key={ep.id}
                    href={`/watch/${drama.slug}/${ep.number}`}
                    className={clsx(
                      "group relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-2xl p-3 ring-1 transition duration-300 hover:-translate-y-0.5",
                      current ? "ring-2" : "ring-white/10 hover:ring-white/30",
                      access === "locked" ? "bg-white/[0.03]" : "bg-white/[0.06]",
                    )}
                    style={current ? { ["--tw-ring-color" as string]: drama.accent } : undefined}
                  >
                    <div className="absolute inset-0 -z-10 opacity-0 transition group-hover:opacity-100" style={{ background: `radial-gradient(100% 80% at 50% 0%, ${drama.accent}33, transparent)` }} />
                    <div className="flex items-start justify-between">
                      {access === "free" && <span className="rounded-md bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-300">{t("free")}</span>}
                      {access === "subscriber" && <span className="rounded-md bg-amber-glow/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-glow">{t("vip")}</span>}
                      {access === "locked" && <Lock className="size-4 text-white/35" />}
                      <span className="text-[10px] text-white/35">{duration(ep.durationSec)}</span>
                    </div>
                    <div className={clsx("font-display text-3xl font-extrabold", access === "locked" ? "text-white/30" : "text-white")}>
                      {String(ep.number).padStart(2, "0")}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
