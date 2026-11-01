import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Play, Flame } from "lucide-react";
import type { DramaCardData } from "@/lib/queries";
import { compact, localized } from "@/lib/format";
import { Poster } from "./poster";
import { HoverPreview } from "./hover-preview";
import { mediaUrl } from "@/lib/format";

export async function DramaCard({ drama, progress, episodeNumber }: { drama: DramaCardData; progress?: number; episodeNumber?: number }) {
  const locale = await getLocale();
  const t = await getTranslations("home");
  const title = localized(locale, drama.title, drama.titleMy);
  const href = episodeNumber ? `/watch/${drama.slug}/${episodeNumber}` : `/drama/${drama.slug}`;
  return (
    <Link href={href} className="group block w-[150px] shrink-0 snap-start sm:w-[180px]">
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl ring-1 ring-white/10 transition duration-500 group-hover:-translate-y-1 group-hover:ring-white/30 group-hover:shadow-[0_20px_50px_-15px_var(--accent)]" style={{ ["--accent" as string]: drama.accent }}>
        <Poster title={title} accent={drama.accent} posterUrl={drama.posterUrl} genre={drama.genre} className="h-full w-full transition duration-700 group-hover:scale-105" />
        {drama.previewKey && <HoverPreview src={mediaUrl(drama.previewKey)!} />}
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold backdrop-blur">
          <Flame className="size-3 text-rose-glow" /> {compact(drama.views)}
        </div>
        <div className="absolute inset-0 grid place-items-center opacity-0 transition duration-300 group-hover:opacity-100">
          <span className="grid size-12 place-items-center rounded-full bg-white/90 text-ink-950 shadow-2xl backdrop-blur"><Play className="ml-0.5 size-5 fill-current" /></span>
        </div>
        {progress !== undefined && (
          <div className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded-full bg-white/20">
            <div className="bg-gradient-brand h-full" style={{ width: `${Math.max(4, progress * 100)}%` }} />
          </div>
        )}
      </div>
      <div className="mt-2.5 px-0.5">
        <div className="line-clamp-1 text-sm font-semibold text-white/90 group-hover:text-white">{title}</div>
        <div className="mt-0.5 text-xs text-white/45">
          {episodeNumber ? `EP ${episodeNumber}` : t("episodes", { count: drama._count.episodes })}
        </div>
      </div>
    </Link>
  );
}
