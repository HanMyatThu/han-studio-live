import "server-only";
import { db } from "./db";
import { getCurrentUser } from "./auth";
import { episodeAccess, getActiveSubscription } from "./access";

/** Load an episode and check the current user may watch it. */
export async function loadWatchableEpisode(episodeId: string) {
  const episode = await db.episode.findUnique({ where: { id: episodeId }, include: { drama: true } });
  if (!episode) return { error: 404 as const };
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";
  if (!isAdmin && (!episode.drama.published || episode.status !== "READY")) return { error: 404 as const };
  if (!isAdmin) {
    const sub = await getActiveSubscription(user?.id);
    if (episodeAccess(episode.number, episode.drama.freeEpisodes, !!sub) === "locked") return { error: 402 as const };
  }
  return { episode };
}
