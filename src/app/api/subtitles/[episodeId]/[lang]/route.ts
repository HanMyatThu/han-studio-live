import { loadWatchableEpisode } from "@/lib/episode-guard";

export async function GET(_: Request, { params }: { params: Promise<{ episodeId: string; lang: string }> }) {
  const { episodeId, lang } = await params;
  const result = await loadWatchableEpisode(episodeId);
  if ("error" in result) return new Response(null, { status: result.error });
  const vtt = lang.startsWith("my") ? result.episode.subtitleMy : result.episode.subtitleEn;
  if (!vtt) return new Response(null, { status: 404 });
  return new Response(vtt, { headers: { "Content-Type": "text/vtt; charset=utf-8", "Cache-Control": "private, max-age=60" } });
}
