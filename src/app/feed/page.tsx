import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/access";
import { localized, mediaUrl } from "@/lib/format";
import { Feed, type FeedItem } from "@/components/feed/feed";
import { BottomNav } from "@/components/bottom-nav";

export const metadata: Metadata = { title: "For You" };
export const dynamic = "force-dynamic";

/** Mix popular dramas with some randomness so the feed feels fresh on each visit. */
function rank<T extends { views: number }>(items: T[]) {
  return items
    .map((d) => ({ d, score: Math.log10(d.views + 10) + Math.random() * 1.5 }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.d);
}

export default async function FeedPage() {
  const [locale, user] = await Promise.all([getLocale(), getCurrentUser()]);
  const sub = await getActiveSubscription(user?.id);
  const dramas = await db.drama.findMany({
    where: { published: true, episodes: { some: { status: "READY" } } },
    include: {
      episodes: { where: { status: "READY" }, orderBy: { number: "asc" }, take: 1, include: { _count: { select: { comments: true } } } },
      _count: { select: { episodes: { where: { status: "READY" } } } },
    },
  });
  const firstIds = dramas.map((d) => d.episodes[0]!.id);
  const myLikes = user
    ? new Set((await db.episodeLike.findMany({ where: { userId: user.id, episodeId: { in: firstIds } }, select: { episodeId: true } })).map((l) => l.episodeId))
    : new Set<string>();

  const items: FeedItem[] = rank(dramas).map((d) => {
    const ep = d.episodes[0]!;
    // Episode 1 plays in full when it is free; otherwise the feed shows the preview clip.
    const canPlay = ep.number <= d.freeEpisodes || !!sub || user?.role === "ADMIN";
    return {
      dramaId: d.id,
      slug: d.slug,
      title: localized(locale, d.title, d.titleMy),
      synopsis: localized(locale, d.synopsis, d.synopsisMy),
      genre: d.genre,
      accent: d.accent,
      episodes: d._count.episodes,
      episodeId: ep.id,
      episodeNumber: ep.number,
      src: canPlay ? `/api/stream/${ep.id}` : mediaUrl(d.previewKey),
      poster: mediaUrl(ep.thumbKey) ?? d.posterUrl,
      likes: ep.likesCount,
      liked: myLikes.has(ep.id),
      comments: ep._count.comments,
    };
  });

  return (
    <>
      <Feed items={items} loggedIn={!!user} />
      <BottomNav />
    </>
  );
}
