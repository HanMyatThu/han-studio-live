import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { parseVtt } from "@/lib/subtitles";
import { SubtitleEditor } from "@/components/admin/subtitle-editor";

export default async function EpisodeSubtitles({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ep = await db.episode.findUnique({ where: { id }, include: { drama: { select: { id: true, title: true } } } });
  if (!ep) notFound();
  return (
    <SubtitleEditor
      episodeId={ep.id}
      number={ep.number}
      drama={ep.drama}
      en={parseVtt(ep.subtitleEn ?? "")}
      my={parseVtt(ep.subtitleMy ?? "")}
    />
  );
}
