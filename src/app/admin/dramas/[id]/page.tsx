import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { updateDrama } from "@/app/actions/admin";
import { DramaForm } from "@/components/admin/drama-form";
import { Uploader } from "@/components/admin/uploader";
import { JobsPanel } from "@/components/admin/jobs-panel";
import { EpisodeTable } from "@/components/admin/episode-table";
import { DramaActions } from "@/components/admin/drama-actions";
import { playbackSource } from "@/lib/playback";
import { bunnyEnabled } from "@/lib/bunny";
import { PosterUpload } from "@/components/admin/poster-upload";

export default async function EditDrama({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("admin");
  const drama = await db.drama.findUnique({ where: { id }, include: { episodes: { orderBy: { number: "asc" } } } });
  if (!drama) notFound();
  const nextNumber = (drama.episodes.at(-1)?.number ?? 0) + 1;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-center">
        <PosterUpload dramaId={drama.id} title={drama.title} accent={drama.accent} posterUrl={drama.posterUrl} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">{drama.title}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-white/50">
            <span>{drama.genre}</span>·<span>{drama.episodes.length} eps</span>
            <Link href={`/drama/${drama.slug}`} className="flex items-center gap-1 hover:text-white"><ExternalLink className="size-3.5" />/drama/{drama.slug}</Link>
          </div>
        </div>
        <DramaActions id={drama.id} title={drama.title} episodes={drama.episodes.length} published={drama.published} localEpisodes={drama.episodes.filter((e) => e.streamProvider !== "bunny").length} bunnyReady={bunnyEnabled()} />
      </div>

      <section>
        <h2 className="mb-3 font-semibold">{t("upload.title")}</h2>
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <Uploader dramaId={drama.id} nextNumber={nextNumber} />
          <JobsPanel dramaId={drama.id} />
        </div>
      </section>

      <section>
        <EpisodeTable
          dramaId={drama.id}
          episodes={drama.episodes.map((e) => ({ id: e.id, number: e.number, durationSec: e.durationSec, status: e.status, hasMy: !!e.subtitleMy, source: playbackSource(e), bunny: e.streamProvider === "bunny" }))}
        />
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Details</h2>
        <DramaForm action={updateDrama.bind(null, drama.id)} drama={drama} />
      </section>
    </div>
  );
}
