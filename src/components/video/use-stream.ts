"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import type Hls from "hls.js";

export type PlaybackSource = { type: "hls" | "mp4"; url: string };
export type Quality = "auto" | "saver" | "high";

const QUALITY_KEY = "zat_quality";
const SAVER_MAX_HEIGHT = 480;

/** Viewer's saved quality choice. Defaults to data saver on slow or metered connections. */
export function getSavedQuality(): Quality {
  try {
    const q = localStorage.getItem(QUALITY_KEY) as Quality | null;
    if (q === "auto" || q === "saver" || q === "high") return q;
  } catch {}
  const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData || ["slow-2g", "2g", "3g"].includes(conn?.effectiveType ?? "")) return "saver";
  return "auto";
}

export function saveQuality(q: Quality) {
  try { localStorage.setItem(QUALITY_KEY, q); } catch {}
  window.dispatchEvent(new CustomEvent("zat:quality", { detail: q }));
}

/** Keeps every player on the page in sync with the viewer's quality choice. */
export function useQuality(): [Quality, (q: Quality) => void] {
  const [q, setQ] = useState<Quality>("auto");
  useEffect(() => {
    setQ(getSavedQuality());
    const on = (e: Event) => setQ((e as CustomEvent<Quality>).detail);
    window.addEventListener("zat:quality", on);
    return () => window.removeEventListener("zat:quality", on);
  }, []);
  return [q, saveQuality];
}

function applyQuality(hls: Hls, quality: Quality) {
  const levels = hls.levels;
  if (!levels?.length) return;
  if (quality === "saver") {
    let cap = 0;
    levels.forEach((l, i) => { if (l.height && l.height <= SAVER_MAX_HEIGHT) cap = i; });
    hls.autoLevelCapping = cap;
    hls.currentLevel = -1;
  } else if (quality === "high") {
    hls.autoLevelCapping = -1;
    hls.currentLevel = levels.length - 1;
  } else {
    hls.autoLevelCapping = -1;
    hls.currentLevel = -1;
  }
}

/**
 * Attach a source to a <video>. MP4 plays directly; HLS uses hls.js
 * (adaptive quality) or the browser's built-in HLS on older iPhones.
 */
export function useStream(videoRef: RefObject<HTMLVideoElement | null>, source: PlaybackSource | null, opts: { enabled?: boolean; quality?: Quality; startAt?: number } = {}) {
  const { enabled = true, quality = "auto", startAt = 0 } = opts;
  const [ready, setReady] = useState(false);
  const hlsRef = useRef<Hls | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const qualityRef = useRef(quality);
  qualityRef.current = quality;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source || !enabled) return;
    let cancelled = false;
    setReady(false);

    if (source.type === "mp4") {
      video.src = source.url;
      setReady(true);
      return () => { video.removeAttribute("src"); video.load(); };
    }

    (async () => {
      const { default: HlsLib } = await import("hls.js");
      if (cancelled) return;
      if (HlsLib.isSupported()) {
        const hls = new HlsLib({ capLevelToPlayerSize: true, maxBufferLength: 20, startLevel: -1, startPosition: startAt > 0 ? startAt : -1 });
        hlsRef.current = hls;
        hls.on(HlsLib.Events.MANIFEST_PARSED, () => { applyQuality(hls, qualityRef.current); setReady(true); });
        hls.on(HlsLib.Events.LEVEL_SWITCHED, (_e, data) => setHeight(hls.levels[data.level]?.height ?? null));
        hls.on(HlsLib.Events.ERROR, (_e, data) => {
          if (!data.fatal) return;
          if (data.type === HlsLib.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === HlsLib.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
        });
        hls.loadSource(source.url);
        hls.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = source.url; // native HLS (older iOS Safari)
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.removeAttribute("src");
      video.load();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.url, source?.type, enabled]);

  useEffect(() => {
    if (hlsRef.current) applyQuality(hlsRef.current, quality);
  }, [quality]);

  return { height, ready, isHls: source?.type === "hls" };
}
