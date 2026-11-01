import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { episodeAccess, getActiveSubscription } from "@/lib/access";
import { localized } from "@/lib/format";
import { Player, type PlayerEpisode } from "@/components/player/player";

type Params = { params: Promise<{ slug: string; ep: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, ep } = await params;
  const drama = await db.drama.findUnique({ where: { slug }, select: { title: true } });
  return { title: drama ? `${drama.title} · EP ${ep}` : "Watch" };
}

export default async function WatchPage({ params }: Params) {
  const { slug, ep } = await params;
  const number = parseInt(ep, 10);
  const [locale, user] = await Promise.all([getLocale(), getCurrentUser()]);
  const drama = await db.drama.findUnique({
    where: { slug },
    include: { episodes: { where: { status: "READY" }, orderBy: { number: "asc" }, select: { id: true, number: true, durationSec: true } } },
  });
  if (!drama || (!drama.published && user?.role !== "ADMIN")) notFound();
  const current = drama.episodes.find((e) => e.number === number);
  if (!current) notFound();

  const sub = await getActiveSubscription(user?.id);
  const isVip = !!sub || user?.role === "ADMIN";
  const progress = user
    ? await db.watchProgress.findUnique({ where: { userId_episodeId: { userId: user.id, episodeId: current.id } } })
    : null;

  const [likes, myLike, comments] = await Promise.all([
    db.episode.findUnique({ where: { id: current.id }, select: { likesCount: true } }),
    user ? db.episodeLike.findUnique({ where: { userId_episodeId: { userId: user.id, episodeId: current.id } } }) : null,
    db.comment.count({ where: { episodeId: current.id } }),
  ]);

  const episodes: PlayerEpisode[] = drama.episodes.map((e) => ({
    id: e.id,
    number: e.number,
    durationSec: e.durationSec,
    access: user?.role === "ADMIN" ? "free" : episodeAccess(e.number, drama.freeEpisodes, isVip),
  }));

  return (
    <Player
      key={current.id}
      drama={{ id: drama.id, slug: drama.slug, title: localized(locale, drama.title, drama.titleMy), accent: drama.accent, posterUrl: drama.posterUrl, genre: drama.genre }}
      episodes={episodes}
      currentNumber={number}
      isVip={isVip}
      loggedIn={!!user}
      startAt={progress && progress.positionSec < current.durationSec - 3 ? progress.positionSec : 0}
      defaultSubtitle="my"
      social={{ likes: likes?.likesCount ?? 0, liked: !!myLike, comments }}
    />
  );
}
