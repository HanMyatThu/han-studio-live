"use client";
import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import clsx from "clsx";
import { deleteDrama } from "@/app/actions/admin";

/** Deletes a drama with every episode, video (also on Bunny), image and comment. */
export function DeleteDramaButton({ id, title, episodes, label = false }: { id: string; title: string; episodes: number; label?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const msg = `Delete "${title}"?\n\nThis removes all ${episodes} episode(s), their videos (also on Bunny), subtitles, artwork, likes and comments. This can't be undone.`;
        if (confirm(msg)) start(() => deleteDrama(id));
      }}
      title="Delete drama and all videos"
      aria-label="Delete drama"
      className={clsx(
        "flex shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-500/10 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50",
        label ? "px-4 py-2.5" : "size-10",
      )}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      {label && <span className="hidden sm:inline">{pending ? "Deleting…" : "Delete"}</span>}
    </button>
  );
}
