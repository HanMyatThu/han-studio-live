"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, Captions, Play, Trash2, CheckCheck, X } from "lucide-react";
import { approveEpisodes, deleteEpisode } from "@/app/actions/admin";
import { duration } from "@/lib/format";
import { StreamVideo } from "../video/stream-video";
import type { PlaybackSource } from "../video/use-stream";

type Ep = { id: string; number: number; durationSec: number; status: string; hasMy: boolean; source: PlaybackSource; bunny: boolean };

export function EpisodeTable({ dramaId, episodes }: { dramaId: string; episodes: Ep[] }) {
  const t = useTranslations("admin");
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<Ep | null>(null);
  const reviewCount = episodes.filter((e) => e.status === "REVIEW").length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{t("episodes.title")} <span className="text-white/40">· {episodes.length}</span></h2>
        {reviewCount > 0 && (
          <button disabled={pending} onClick={() => start(() => approveEpisodes(dramaId))} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-ink-950">
            <CheckCheck className="size-4" /> {t("episodes.approveAll")} ({reviewCount})
          </button>
        )}
      </div>
      {episodes.length === 0 ? (
        <p className="glass rounded-2xl p-6 text-center text-sm text-white/45">{t("episodes.empty")}</p>
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          {episodes.map((e) => (
            <div key={e.id} className="flex items-center gap-3 border-b border-white/5 px-4 py-3 last:border-0">
              <button onClick={() => setPreview(e)} className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/5 font-display font-extrabold hover:bg-white/10" aria-label="Preview">
                {e.number}
              </button>
              <div className="min-w-0 flex-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">EP {e.number}</span>
                  <span className="text-white/40">{duration(e.durationSec)}</span>
                  <span className={e.bunny ? "rounded bg-orange-400/15 px-1.5 text-[10px] font-semibold text-orange-300" : "rounded bg-white/5 px-1.5 text-[10px] font-semibold text-white/40"}>{e.bunny ? "Bunny" : "Local"}</span>
                  {e.hasMy && <span className="rounded bg-white/10 px-1.5 text-[10px] font-semibold text-white/60">မြန်မာ</span>}
                </div>
              </div>
              <span className={e.status === "READY" ? "rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300" : "rounded-full bg-amber-glow/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-glow"}>
                {e.status === "READY" ? t("ready") : t("review")}
              </span>
              <button onClick={() => setPreview(e)} className="hidden size-8 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white sm:grid" aria-label="Play"><Play className="size-4" /></button>
              <Link href={`/admin/episodes/${e.id}`} className="grid size-8 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white" title={t("episodes.editSubs")}><Captions className="size-4" /></Link>
              {e.status === "REVIEW" && (
                <button disabled={pending} onClick={() => start(() => approveEpisodes(dramaId, [e.id]))} className="grid size-8 place-items-center rounded-lg text-emerald-300 hover:bg-emerald-400/10" title={t("episodes.approve")}><Check className="size-4" /></button>
              )}
              <button disabled={pending} onClick={() => { if (confirm(`Delete EP ${e.number}?`)) start(() => deleteEpisode(e.id)); }} className="grid size-8 place-items-center rounded-lg text-rose-300/70 hover:bg-rose-500/10 hover:text-rose-300" title={t("delete")}><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur" onClick={() => setPreview(null)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <StreamVideo source={preview.source} controls autoPlay className="max-h-[80dvh] rounded-2xl ring-1 ring-white/10">
              <track kind="subtitles" srcLang="my" label="မြန်မာ" src={`/api/subtitles/${preview.id}/my`} default />
              <track kind="subtitles" srcLang="en" label="English" src={`/api/subtitles/${preview.id}/en`} />
            </StreamVideo>
            <button onClick={() => setPreview(null)} className="absolute -right-3 -top-3 grid size-8 place-items-center rounded-full bg-white text-ink-950"><X className="size-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
