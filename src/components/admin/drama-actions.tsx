"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { DeleteDramaButton } from "./delete-drama-button";
import { Eye, EyeOff, ImagePlay, CloudUpload } from "lucide-react";
import { moveDramaToBunny, regenerateArtwork, setPublished } from "@/app/actions/admin";

export function DramaActions({ id, title, episodes, published, localEpisodes = 0, bunnyReady = false }: { id: string; title: string; episodes: number; published: boolean; localEpisodes?: number; bunnyReady?: boolean }) {
  const t = useTranslations("admin");
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {localEpisodes > 0 && (
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await moveDramaToBunny(id);
              setNote("error" in res && res.error ? res.error : "Moving to Bunny… watch the jobs panel.");
            })
          }
          title={bunnyReady ? `Upload ${localEpisodes} local episode(s) to Bunny Stream` : "Bunny Stream keys are not set yet"}
          className="glass flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-orange-200 disabled:opacity-50"
        >
          <CloudUpload className="size-4" /> <span className="hidden sm:inline">Move to Bunny ({localEpisodes})</span>
        </button>
      )}
      <button
        disabled={pending}
        onClick={() => start(() => regenerateArtwork(id))}
        title="Regenerate thumbnails, auto poster and preview clip from the video"
        className="glass flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
      >
        <ImagePlay className="size-4" /> <span className="hidden sm:inline">{pending ? "…" : "Artwork"}</span>
      </button>
      <button
        disabled={pending}
        onClick={() => start(() => setPublished(id, !published))}
        className={published ? "glass flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold" : "flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-ink-950"}
      >
        {published ? <><EyeOff className="size-4" />{t("unpublish")}</> : <><Eye className="size-4" />{t("publish")}</>}
      </button>
      <DeleteDramaButton id={id} title={title} episodes={episodes} label />
      {note && <p className="w-full text-xs text-white/55">{note}</p>}
    </div>
  );
}
