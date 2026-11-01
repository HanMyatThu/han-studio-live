import { Readable } from "node:stream";
import { loadWatchableEpisode } from "@/lib/episode-guard";
import { createReadStream, exists, fileSize } from "@/lib/storage";

/**
 * Streams an episode with HTTP Range support, after checking access.
 * In production you would return a short-lived signed URL from Bunny Stream instead.
 */
export async function GET(req: Request, { params }: { params: Promise<{ episodeId: string }> }) {
  const { episodeId } = await params;
  const result = await loadWatchableEpisode(episodeId);
  if ("error" in result) return new Response(null, { status: result.error });
  const key = result.episode.videoKey;
  if (!exists(key)) return new Response(null, { status: 404 });

  const size = await fileSize(key);
  const range = req.headers.get("range");
  const headers: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
  };

  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = m?.[1] ? parseInt(m[1], 10) : 0;
    let end = m?.[2] ? parseInt(m[2], 10) : size - 1;
    if (!m?.[1] && m?.[2]) { start = size - parseInt(m[2], 10); end = size - 1; }
    end = Math.min(end, size - 1);
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    const stream = Readable.toWeb(createReadStream(key, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  const stream = Readable.toWeb(createReadStream(key)) as ReadableStream;
  return new Response(stream, { headers: { ...headers, "Content-Length": String(size) } });
}
