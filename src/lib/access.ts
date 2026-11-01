import "server-only";
import { db } from "./db";

export async function getActiveSubscription(userId: string | undefined | null) {
  if (!userId) return null;
  return db.subscription.findFirst({
    where: { userId, endsAt: { gt: new Date() } },
    orderBy: { endsAt: "desc" },
    include: { plan: true },
  });
}

export type EpisodeAccess = "free" | "subscriber" | "locked";

/** Decide whether a user can watch an episode. */
export function episodeAccess(
  episodeNumber: number,
  freeEpisodes: number,
  isSubscriber: boolean,
): EpisodeAccess {
  if (episodeNumber <= freeEpisodes) return "free";
  return isSubscriber ? "subscriber" : "locked";
}
