import "server-only";
import { db } from "./db";
import { ensureDir, storagePath, exists } from "./storage";
import { extractFrame, extractPoster, makePreview } from "./media";

import { mediaUrl } from "./format";
export { mediaUrl };

/** Thumbnail for one episode, from about a third of the way in. */
export async function generateEpisodeThumb(episodeId: string) {
  const ep = await db.episode.findUnique({ where: { id: episodeId } });
  if (!ep || !exists(ep.videoKey)) return;
  const key = `thumbs/${ep.dramaId}/${ep.id}-${Date.now()}.jpg`;
  await ensureDir(key);
  await extractFrame(storagePath(ep.videoKey), Math.max(0.5, ep.durationSec * 0.33), storagePath(key));
  await db.episode.update({ where: { id: ep.id }, data: { thumbKey: key } });
}

/**
 * Fill in a poster and a preview clip from episode 1 when the admin
 * hasn't uploaded their own. Uploaded posters are never overwritten.
 */
export async function generateDramaArtwork(dramaId: string, opts: { force?: boolean } = {}) {
  const drama = await db.drama.findUnique({
    where: { id: dramaId },
    include: { episodes: { orderBy: { number: "asc" }, take: 1 } },
  });
  const first = drama?.episodes[0];
  if (!drama || !first || !exists(first.videoKey)) return;
  const src = storagePath(first.videoKey);
  const data: { posterUrl?: string; previewKey?: string } = {};

  const autoPoster = !drama.posterUrl || drama.posterUrl.startsWith("/api/media/posters/auto-");
  if (autoPoster && (opts.force || !drama.posterUrl)) {
    const key = `posters/auto-${drama.id}-${Date.now()}.jpg`;
    await ensureDir(key);
    await extractPoster(src, Math.max(0.5, first.durationSec * 0.25), storagePath(key));
    data.posterUrl = mediaUrl(key)!;
  }
  if (opts.force || !drama.previewKey) {
    const key = `previews/${drama.id}-${Date.now()}.mp4`;
    await ensureDir(key);
    const start = first.durationSec > 12 ? 2 : 0;
    await makePreview(src, start, Math.min(8, Math.max(2, first.durationSec - start)), storagePath(key));
    data.previewKey = key;
  }
  if (Object.keys(data).length) await db.drama.update({ where: { id: drama.id }, data });
}
