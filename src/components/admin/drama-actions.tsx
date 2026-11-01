"use client";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Trash2, ImagePlay } from "lucide-react";
import { deleteDrama, regenerateArtwork, setPublished } from "@/app/actions/admin";

export function DramaActions({ id, published }: { id: string; published: boolean }) {
  const t = useTranslations("admin");
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
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
      <button
        disabled={pending}
        onClick={() => { if (confirm("Delete this drama and all its episodes?")) start(() => deleteDrama(id)); }}
        className="grid size-10 place-items-center rounded-xl bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
        aria-label={t("delete")}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
