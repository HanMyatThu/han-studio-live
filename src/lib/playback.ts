import "server-only";
import { playbackUrl } from "./bunny";

export type PlaybackSource = { type: "hls" | "mp4"; url: string };

/** Where the browser should load an episode from. Call only after the access check. */
export function playbackSource(ep: { id: string; streamProvider: string; streamId: string | null }): PlaybackSource {
  if (ep.streamProvider === "bunny" && ep.streamId) return { type: "hls", url: playbackUrl(ep.streamId) };
  return { type: "mp4", url: `/api/stream/${ep.id}` };
}
