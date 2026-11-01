import "server-only";
import { db } from "./db";

export const dramaCardSelect = {
  id: true, slug: true, title: true, titleMy: true, genre: true, posterUrl: true, accent: true,
  freeEpisodes: true, views: true, synopsis: true, synopsisMy: true, featured: true, createdAt: true,
  _count: { select: { episodes: { where: { status: "READY" } } } },
} as const;

export type DramaCardData = Awaited<ReturnType<typeof getPublishedDramas>>[number];

export function getPublishedDramas(opts: { genre?: string; q?: string; take?: number; orderBy?: "views" | "new" } = {}) {
  return db.drama.findMany({
    where: {
      published: true,
      ...(opts.genre ? { genre: opts.genre } : {}),
      ...(opts.q
        ? { OR: [{ title: { contains: opts.q } }, { titleMy: { contains: opts.q } }, { tags: { contains: opts.q } }] }
        : {}),
    },
    select: dramaCardSelect,
    orderBy: opts.orderBy === "new" ? { createdAt: "desc" } : { views: "desc" },
    take: opts.take,
  });
}

export async function getContinueWatching(userId: string) {
  const rows = await db.watchProgress.findMany({
    where: { userId, episode: { drama: { published: true } } },
    orderBy: { updatedAt: "desc" },
    include: { episode: { include: { drama: { select: dramaCardSelect } } } },
    take: 30,
  });
  const seen = new Set<string>();
  return rows
    .filter((r) => (seen.has(r.episode.dramaId) ? false : (seen.add(r.episode.dramaId), true)))
    .slice(0, 12)
    .map((r) => ({
      drama: r.episode.drama,
      episodeNumber: r.episode.number,
      progress: r.episode.durationSec ? Math.min(1, r.positionSec / r.episode.durationSec) : 0,
    }));
}

export const GENRES = ["Romance", "Revenge", "CEO", "Fantasy", "Thriller", "Family", "Comedy"] as const;
