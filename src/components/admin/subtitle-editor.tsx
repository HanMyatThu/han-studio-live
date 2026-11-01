"use client";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronLeft, Check, Loader2 } from "lucide-react";
import clsx from "clsx";
import { saveSubtitles } from "@/app/actions/admin";
import { toVtt, type Cue } from "@/lib/subtitles";

const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

export function SubtitleEditor(props: { episodeId: string; number: number; drama: { id: string; title: string }; en: Cue[]; my: Cue[] }) {
  const t = useTranslations("admin");
  const video = useRef<HTMLVideoElement>(null);
  const [rows, setRows] = useState(() =>
    props.en.map((c, i) => ({ start: c.start, end: c.end, en: c.text, my: props.my[i]?.text ?? "" })),
  );
  const [time, setTime] = useState(0);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const current = rows.find((r) => time >= r.start && time <= r.end);

  const save = () =>
    start(async () => {
      await saveSubtitles(props.episodeId, "en", toVtt(rows.map((r) => ({ start: r.start, end: r.end, text: r.en }))));
      await saveSubtitles(props.episodeId, "my", toVtt(rows.map((r) => ({ start: r.start, end: r.end, text: r.my }))));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });

  return (
    <div className="mx-auto max-w-6xl">
      <Link href={`/admin/dramas/${props.drama.id}`} className="flex items-center gap-1 text-sm text-white/50 hover:text-white"><ChevronLeft className="size-4" />{props.drama.title}</Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold">{t("subs.title", { number: props.number })}</h1>
        <button onClick={save} disabled={pending} className="bg-gradient-brand flex items-center gap-2 rounded-xl px-5 py-2.5 font-bold">
          {pending ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : null}
          {saved ? t("saved") : t("save")}
        </button>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="relative overflow-hidden rounded-2xl bg-black ring-1 ring-white/10">
            <video ref={video} src={`/api/stream/${props.episodeId}`} controls className="max-h-[70dvh] w-full bg-black object-contain" onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} />
            {current && (
              <div className="pointer-events-none absolute inset-x-3 bottom-16 text-center">
                <span lang="my" className="rounded bg-black/60 px-2 py-0.5 text-sm leading-loose">{current.my || current.en}</span>
              </div>
            )}
          </div>
        </div>
        <div className="glass divide-y divide-white/5 overflow-hidden rounded-2xl">
          <div className="grid grid-cols-[70px_1fr_1fr] gap-3 px-4 py-2 text-xs font-semibold text-white/45">
            <span>Time</span><span>{t("subs.english")}</span><span>{t("subs.burmese")}</span>
          </div>
          {rows.map((r, i) => (
            <div key={i} className={clsx("grid grid-cols-[70px_1fr_1fr] items-start gap-3 px-4 py-2.5 transition", current === r && "bg-rose-glow/10")}>
              <button onClick={() => { if (video.current) { video.current.currentTime = r.start; video.current.play(); } }} className="pt-2 text-left font-mono text-xs text-white/50 hover:text-white">
                {fmt(r.start)}
              </button>
              <textarea rows={2} value={r.en} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, en: e.target.value } : x)))} className="w-full resize-none rounded-lg bg-white/5 px-2.5 py-1.5 text-sm outline-none ring-1 ring-white/5 focus:ring-rose-glow/50" />
              <textarea lang="my" rows={2} value={r.my} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, my: e.target.value } : x)))} className="w-full resize-none rounded-lg bg-white/5 px-2.5 py-1.5 text-sm leading-relaxed outline-none ring-1 ring-white/5 focus:ring-rose-glow/50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
