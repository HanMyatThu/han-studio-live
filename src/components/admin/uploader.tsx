"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { UploadCloud, Scissors, Film, X, Wand2 } from "lucide-react";
import clsx from "clsx";

const CHUNK = 8 * 1024 * 1024; // 8 MB
const MAX_RETRIES = 12; // about 5 minutes of reconnecting before giving up

/** PUT one chunk with progress (fetch can't report upload progress). */
function sendChunk(url: string, chunk: Blob, onProgress: (loaded: number) => void) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.timeout = 120_000;
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
    xhr.onerror = () => reject(new Error("network"));
    xhr.ontimeout = () => reject(new Error("timeout"));
    xhr.send(chunk);
  });
}

export function Uploader({ dramaId, nextNumber }: { dramaId: string; nextNumber: number }) {
  const t = useTranslations("admin.upload");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"split" | "single">("split");
  const [file, setFile] = useState<File | null>(null);
  const [count, setCount] = useState(10);
  const [number, setNumber] = useState(nextNumber);
  const [percent, setPercent] = useState<number | null>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  // Warn before leaving the page while a file is still uploading.
  useEffect(() => {
    if (percent === null) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [percent]);

  async function upload() {
    if (!file) return;
    setError(null);
    setRetrying(false);
    setPercent(0);
    const uploadId = crypto.randomUUID();
    const base = new URLSearchParams({ dramaId, uploadId });
    try {
      // Send the file in small pieces. A dropped connection only repeats one piece.
      let offset = 0;
      let failures = 0;
      while (offset < file.size) {
        const chunk = file.slice(offset, offset + CHUNK);
        const res = await sendChunk(`/api/admin/upload/chunk?${base}&offset=${offset}`, chunk, (loaded) =>
          setPercent(Math.min(99, Math.floor(((offset + loaded) / file.size) * 100))),
        ).catch(() => null);

        if (res && (res.status === 200 || res.status === 409)) {
          offset = (JSON.parse(res.body) as { size: number }).size; // 409: server tells us where to resume
          failures = 0;
          setRetrying(false);
          continue;
        }
        if (res && res.status < 500 && res.status !== 0) throw new Error(res.body || `Upload failed (${res.status})`);
        if (++failures > MAX_RETRIES) throw new Error(t("connectionLost"));
        setRetrying(true);
        await new Promise((r) => setTimeout(r, Math.min(30000, 1000 * 2 ** failures)));
        // Ask the server how much arrived, in case the last piece made it after all.
        const status = await fetch(`/api/admin/upload/chunk?${base}`).then((r) => r.json()).catch(() => null);
        if (status && typeof status.size === "number") offset = status.size;
      }

      const qs = new URLSearchParams({ dramaId, uploadId, size: String(file.size), mode, count: String(count), number: String(number), name: file.name });
      const done = await fetch(`/api/admin/upload?${qs}`, { method: "POST" });
      if (!done.ok) throw new Error((await done.json().catch(() => null))?.error ?? `Upload failed (${done.status})`);
      setFile(null);
      window.dispatchEvent(new Event("zat:job-started"));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPercent(null);
      setRetrying(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-1 text-sm font-semibold">
        {(["split", "single"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={clsx("flex items-center justify-center gap-2 rounded-lg py-2 transition", mode === m ? "bg-white text-ink-950" : "text-white/60 hover:text-white")}>
            {m === "split" ? <Scissors className="size-4" /> : <Film className="size-4" />}
            <span className="truncate">{m === "split" ? t("modeSplit") : t("modeSingle")}</span>
          </button>
        ))}
      </div>

      <div
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
        className={clsx(
          "mt-4 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed px-4 py-10 text-center transition",
          drag ? "border-rose-glow bg-rose-glow/10" : "border-white/15 hover:border-white/30 hover:bg-white/[0.03]",
        )}
      >
        {file ? (
          <div className="flex items-center gap-3">
            <Film className="size-8 text-rose-glow" />
            <div className="text-left">
              <div className="max-w-[240px] truncate font-semibold">{file.name}</div>
              <div className="text-xs text-white/50">{(file.size / 1024 / 1024).toFixed(1)} MB</div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="grid size-7 place-items-center rounded-full bg-white/10"><X className="size-4" /></button>
          </div>
        ) : (
          <div>
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2.4 }}>
              <UploadCloud className="mx-auto size-10 text-white/40" />
            </motion.div>
            <div className="mt-2 text-sm text-white/60">{t("drop")}</div>
          </div>
        )}
        <input ref={input} type="file" accept="video/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {mode === "split" && (
          <label className="text-xs font-semibold text-white/55">
            {t("count")}
            <input type="number" min={2} max={100} value={count} onChange={(e) => setCount(Number(e.target.value))} className="mt-1.5 w-full rounded-xl bg-white/5 px-3 py-2 text-base text-white outline-none ring-1 ring-white/10 focus:ring-rose-glow/60" />
          </label>
        )}
        <label className="text-xs font-semibold text-white/55">
          {mode === "split" ? t("startNumber") : t("number")}
          <input type="number" min={1} value={number} onChange={(e) => setNumber(Number(e.target.value))} className="mt-1.5 w-full rounded-xl bg-white/5 px-3 py-2 text-base text-white outline-none ring-1 ring-white/10 focus:ring-rose-glow/60" />
        </label>
      </div>

      <p className="mt-4 flex gap-2 text-xs text-white/45"><Wand2 className="size-4 shrink-0 text-amber-glow" />{t("hint")}</p>

      <button
        disabled={!file || percent !== null}
        onClick={upload}
        className="bg-gradient-brand relative mt-4 w-full overflow-hidden rounded-xl py-3 font-bold disabled:opacity-50"
      >
        {percent !== null && <span className="absolute inset-y-0 left-0 bg-white/25 transition-all" style={{ width: `${percent}%` }} />}
        <span className="relative">{percent !== null ? (retrying ? t("reconnecting", { percent }) : t("uploading", { percent })) : t("start")}</span>
      </button>
      {percent !== null && <p className="mt-3 text-xs text-white/45">{t("keepOpen")}</p>}
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
    </div>
  );
}
