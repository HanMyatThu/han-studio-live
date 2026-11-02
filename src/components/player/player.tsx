"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronUp, ChevronDown, Captions, ListVideo, MessageCircle, Play, Pause, Volume2, VolumeX, Gauge, Maximize, Minimize, Signal } from "lucide-react";
import clsx from "clsx";
import { parseVtt, type Cue } from "@/lib/subtitles";
import { saveProgress, countView } from "@/app/actions/viewer";
import { Poster } from "../poster";
import { PrerollAd } from "./preroll-ad";
import { Paywall } from "./paywall";
import { EpisodeSheet } from "./episode-sheet";
import { LikeButton } from "./like-button";
import { CommentsSheet } from "./comments-sheet";
import { useQuality, useStream, type PlaybackSource, type Quality } from "../video/use-stream";

export type PlayerEpisode = { id: string; number: number; durationSec: number; access: "free" | "subscriber" | "locked" };
type Drama = { id: string; slug: string; title: string; accent: string; posterUrl: string | null; genre: string };
type SubLang = "my" | "en" | "off";

const SPEEDS = [1, 1.25, 1.5, 2];
const NEXT_QUALITY: Record<Quality, Quality> = { auto: "saver", saver: "high", high: "auto" };

export function Player(props: {
  drama: Drama;
  episodes: PlayerEpisode[];
  currentNumber: number;
  isVip: boolean;
  loggedIn: boolean;
  startAt: number;
  defaultSubtitle: SubLang;
  social: { likes: number; liked: boolean; comments: number };
  source: PlaybackSource | null;
}) {
  const { drama, episodes, currentNumber, isVip, loggedIn, startAt } = props;
  const t = useTranslations("player");
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const episode = episodes.find((e) => e.number === currentNumber)!;
  const idx = episodes.indexOf(episode);
  const next = episodes[idx + 1];
  const prev = episodes[idx - 1];
  const locked = episode.access === "locked";

  const [showAd, setShowAd] = useState(!isVip && !locked);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(episode.durationSec);
  const [subLang, setSubLang] = useState<SubLang>(props.defaultSubtitle);
  const [cues, setCues] = useState<Record<string, Cue[]>>({});
  const [sheet, setSheet] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(props.social.comments);
  const [speed, setSpeed] = useState(1);
  const [chrome, setChrome] = useState(true);
  const [autoNext, setAutoNext] = useState<number | null>(null);
  const [dir, setDir] = useState(0);
  // Videos can be vertical (reels) or horizontal (YouTube-style). We detect it from the file.
  const [landscape, setLandscape] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const [quality, setQuality] = useQuality();
  const { height, ready, isHls } = useStream(videoRef, locked ? null : props.source, { enabled: !locked, quality, startAt });

  // The video may load before React attaches onLoadedMetadata, so also check after mount.
  useEffect(() => {
    const v = videoRef.current;
    if (v && v.readyState >= 1 && v.videoWidth) {
      setLandscape(v.videoWidth > v.videoHeight);
      setDur(v.duration);
    }
  }, [episode.id, showAd]);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  async function toggleFullscreen() {
    const el = frameRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
        // On phones, turn sideways for horizontal videos.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (landscape) await (screen.orientation as any)?.lock?.("landscape").catch(() => {});
      }
    } catch {}
  }

  // Remember subtitle language across episodes.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("zat_sub") as SubLang | null;
      if (saved) setSubLang(saved);
    } catch {}
  }, []);
  const chooseSub = (l: SubLang) => {
    setSubLang(l);
    try { localStorage.setItem("zat_sub", l); } catch {}
  };

  // Load subtitles for this episode.
  useEffect(() => {
    if (locked) return;
    (["my", "en"] as const).forEach(async (l) => {
      const res = await fetch(`/api/subtitles/${episode.id}/${l}`);
      if (res.ok) {
        const parsed = parseVtt(await res.text());
        setCues((c) => ({ ...c, [l]: parsed }));
      }
    });
  }, [episode.id, locked]);

  const go = useCallback(
    (target?: PlayerEpisode, direction = 1) => {
      if (!target) return;
      setDir(direction);
      router.push(`/watch/${drama.slug}/${target.number}`);
    },
    [router, drama.slug],
  );

  // Start playback after the ad.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || showAd || locked || !ready) return;
    if (startAt && !isHls) v.currentTime = startAt;
    v.play().catch(() => {
      v.muted = true;
      setMuted(true);
      v.play().catch(() => {});
    });
    countView(drama.id).catch(() => {});
  }, [showAd, locked, startAt, drama.id, ready, isHls]);

  // Save progress every few seconds.
  useEffect(() => {
    if (!loggedIn || locked) return;
    const id = setInterval(() => {
      const v = videoRef.current;
      if (v && !v.paused) saveProgress(episode.id, v.currentTime).catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [loggedIn, locked, episode.id]);

  // Auto-hide controls.
  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => setChrome(false), 3000);
    return () => clearTimeout(id);
  }, [playing, chrome, time]);

  // Countdown to next episode.
  useEffect(() => {
    if (autoNext === null) return;
    if (autoNext <= 0) { go(next, 1); return; }
    const id = setTimeout(() => setAutoNext((n) => (n === null ? null : n - 1)), 1000);
    return () => clearTimeout(id);
  }, [autoNext, go, next]);

  // Keyboard, wheel and swipe navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowDown") go(next, 1);
      if (e.key === "ArrowUp") go(prev, -1);
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === " ") { e.preventDefault(); toggle(); }
    };
    let wheelLock = false;
    const onWheel = (e: WheelEvent) => {
      if (wheelLock || sheet || commentsOpen || Math.abs(e.deltaY) < 40) return;
      wheelLock = true;
      setTimeout(() => (wheelLock = false), 900);
      if (e.deltaY > 0) go(next, 1); else go(prev, -1);
    };
    let startY: number | null = null;
    const onTouchStart = (e: TouchEvent) => (startY = e.touches[0].clientY);
    const onTouchEnd = (e: TouchEvent) => {
      if (startY === null || sheet || commentsOpen) return;
      const dy = e.changedTouches[0].clientY - startY;
      if (dy < -70) go(next, 1);
      if (dy > 70) go(prev, -1);
      startY = null;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go, next, prev, sheet, commentsOpen]);

  function toggle() {
    const v = videoRef.current;
    if (!v) return;
    setChrome(true);
    if (v.paused) v.play(); else { v.pause(); if (loggedIn) saveProgress(episode.id, v.currentTime).catch(() => {}); }
  }

  const activeCue = subLang !== "off" ? cues[subLang]?.find((c) => time >= c.start && time <= c.end) : undefined;
  const pct = dur ? (time / dur) * 100 : 0;

  return (
    <div className="fixed inset-0 overflow-hidden bg-black" onMouseMove={() => setChrome(true)}>
      {/* Ambient backdrop */}
      <div className="absolute inset-0 opacity-60" style={{ background: `radial-gradient(60% 50% at 50% 40%, ${drama.accent}55, transparent 70%)` }} />
      <div className="animate-aurora absolute -left-1/4 top-1/4 size-[700px] rounded-full opacity-25 blur-3xl" style={{ background: drama.accent }} />

      <AnimatePresence mode="popLayout" custom={dir}>
        <motion.div
          key={episode.id}
          custom={dir}
          initial={{ y: dir >= 0 ? "30%" : "-30%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div
            ref={frameRef}
            className={clsx(
              "relative h-full w-full overflow-hidden bg-black transition-[width,height,aspect-ratio] duration-500",
              fullscreen
                ? ""
                : landscape
                  ? "sm:aspect-video sm:h-auto sm:w-[min(94vw,calc((100dvh-2rem)*16/9))] lg:w-[min(84vw,calc((100dvh-2rem)*16/9))] sm:rounded-[28px] sm:ring-1 sm:ring-white/10 sm:shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]"
                  : "sm:aspect-[9/16] sm:h-[calc(100dvh-2rem)] sm:w-auto sm:rounded-[28px] sm:ring-1 sm:ring-white/10 sm:shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]",
            )}
          >
            {locked ? (
              <>
                <Poster title={drama.title} accent={drama.accent} posterUrl={drama.posterUrl} genre={drama.genre} size="lg" className="absolute inset-0 h-full w-full scale-110 blur-md" />
                <Paywall number={episode.number} loggedIn={loggedIn} />
              </>
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  preload="auto"
                  className={clsx("absolute inset-0 h-full w-full", landscape ? "object-contain" : "object-cover")}
                  onClick={toggle}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    setDur(v.duration);
                    setLandscape(v.videoWidth > v.videoHeight);
                  }}
                  onEnded={() => { if (loggedIn) saveProgress(episode.id, dur).catch(() => {}); if (next) setAutoNext(3); }}
                />
                <AnimatePresence>
                  {activeCue && (
                    <motion.div
                      key={activeCue.start + subLang}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="pointer-events-none absolute bottom-28 left-5 right-20 text-center"
                    >
                      <span lang={subLang} className="box-decoration-clone rounded-lg bg-black/55 px-3 py-1 text-[17px] font-medium leading-[2] text-white shadow-lg backdrop-blur-sm [font-family:var(--font-myanmar),var(--font-jakarta)]">
                        {activeCue.text}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {!playing && !showAd && chrome && (
                    <motion.button
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.3, opacity: 0 }}
                      onClick={toggle}
                      className="absolute left-1/2 top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/15 backdrop-blur-xl ring-1 ring-white/30"
                      aria-label="Play"
                    >
                      <Play className="ml-1 size-9 fill-white" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* Top bar */}
            <div className={clsx("absolute inset-x-0 top-0 flex items-center gap-3 bg-gradient-to-b from-black/70 to-transparent p-4 pt-[max(1rem,env(safe-area-inset-top))] transition-opacity duration-500", chrome || !playing ? "opacity-100" : "opacity-0")}>
              <Link href={`/drama/${drama.slug}`} className="grid size-10 place-items-center rounded-full bg-black/30 backdrop-blur" aria-label={t("back")}>
                <ChevronLeft className="size-6" />
              </Link>
              <div className="min-w-0">
                <div className="truncate font-display text-sm font-bold">{drama.title}</div>
                <div className="text-xs text-white/60">
                  {t("episode", { number: episode.number })} <span className="text-white/40">{t("of", { total: episodes.length })}</span>
                </div>
              </div>
            </div>

            {/* Right rail */}
            {!locked && (
              <div className={clsx("absolute bottom-28 right-3 flex flex-col items-center gap-2.5 transition-opacity duration-500", chrome || !playing ? "opacity-100" : "opacity-0")}>
                <LikeButton episodeId={episode.id} initialLiked={props.social.liked} initialCount={props.social.likes} />
                <RailButton label={String(commentCount)} onClick={() => setCommentsOpen(true)}><MessageCircle className="size-6" /></RailButton>
                <RailButton label={t("allEpisodes")} onClick={() => setSheet(true)}><ListVideo className="size-6" /></RailButton>
                <RailButton
                  label={subLang === "off" ? t("subtitlesOff") : subLang === "my" ? "မြန်မာ" : "EN"}
                  onClick={() => chooseSub(subLang === "my" ? "en" : subLang === "en" ? "off" : "my")}
                  active={subLang !== "off"}
                >
                  <Captions className="size-6" />
                </RailButton>
                <RailButton label={`${speed}x`} onClick={() => {
                  const s = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
                  setSpeed(s);
                  if (videoRef.current) videoRef.current.playbackRate = s;
                }}>
                  <Gauge className="size-6" />
                </RailButton>
                {isHls && (
                  <RailButton
                    label={quality === "saver" ? t("qualitySaver") : quality === "high" ? "HD" : height ? `${height}p` : t("qualityAuto")}
                    active={quality !== "auto"}
                    onClick={() => setQuality(NEXT_QUALITY[quality])}
                  >
                    <Signal className="size-6" />
                  </RailButton>
                )}
                <RailButton label="" onClick={toggleFullscreen}>
                  {fullscreen ? <Minimize className="size-6" /> : <Maximize className="size-6" />}
                </RailButton>
                <RailButton label="" onClick={() => {
                  const v = videoRef.current; if (!v) return;
                  v.muted = !v.muted; setMuted(v.muted);
                }}>
                  {muted ? <VolumeX className="size-6" /> : <Volume2 className="size-6" />}
                </RailButton>
              </div>
            )}

            {/* Bottom: progress + nav */}
            {!locked && (
              <div className={clsx("absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-16 transition-opacity duration-500", chrome || !playing ? "opacity-100" : "opacity-0")}>
                <div className="mb-3 flex items-center justify-between text-xs text-white/60">
                  <button onClick={toggle} className="flex items-center gap-1.5 font-semibold text-white">
                    {playing ? <Pause className="size-4 fill-white" /> : <Play className="size-4 fill-white" />}
                    {fmt(time)} <span className="text-white/40">/ {fmt(dur)}</span>
                  </button>
                  {next && <span className="flex items-center gap-1"><ChevronUp className="size-3.5" />{t("swipeHint")}</span>}
                </div>
                <input
                  type="range"
                  min={0}
                  max={dur || 1}
                  step={0.1}
                  value={time}
                  onChange={(e) => { const v = videoRef.current; if (v) v.currentTime = Number(e.target.value); }}
                  className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-white [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                  style={{ background: `linear-gradient(90deg, #ff3d81 0%, #ffb547 ${pct}%, rgba(255,255,255,0.2) ${pct}%)` }}
                  aria-label="Seek"
                />
              </div>
            )}

            <AnimatePresence>
              {showAd && <PrerollAd onDone={() => setShowAd(false)} />}
            </AnimatePresence>

            <AnimatePresence>
              {autoNext !== null && next && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-sm">
                  <div className="text-center">
                    <div className="text-sm text-white/60">{t("next")}</div>
                    <div className="font-display mt-1 text-6xl font-extrabold">{autoNext}</div>
                    <div className="mt-6 flex gap-3">
                      <button onClick={() => setAutoNext(null)} className="glass rounded-full px-5 py-2.5 text-sm font-semibold">✕</button>
                      <button onClick={() => go(next, 1)} className="rounded-full bg-white px-6 py-2.5 text-sm font-bold text-ink-950">{t("episode", { number: next.number })} ▶</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <CommentsSheet
              open={commentsOpen}
              onClose={() => setCommentsOpen(false)}
              episodeId={episode.id}
              loggedIn={loggedIn}
              onCountChange={(d) => setCommentCount((c) => Math.max(0, c + d))}
            />

            <EpisodeSheet
              open={sheet}
              onClose={() => setSheet(false)}
              episodes={episodes}
              current={episode.number}
              slug={drama.slug}
              accent={drama.accent}
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Desktop nav arrows */}
      <div className="absolute right-8 top-1/2 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
        <button disabled={!prev} onClick={() => go(prev, -1)} className="glass grid size-12 place-items-center rounded-full transition hover:bg-white/15 disabled:opacity-30" aria-label={t("prev")}><ChevronUp /></button>
        <button disabled={!next} onClick={() => go(next, 1)} className="glass grid size-12 place-items-center rounded-full transition hover:bg-white/15 disabled:opacity-30" aria-label={t("next")}><ChevronDown /></button>
      </div>
    </div>
  );
}

function RailButton({ children, label, onClick, active }: { children: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 text-[11px] font-semibold text-white drop-shadow">
      <span className={clsx("grid size-11 place-items-center rounded-full backdrop-blur-md transition active:scale-90", active ? "bg-white/25 ring-1 ring-white/40" : "bg-black/30")}>{children}</span>
      {label}
    </button>
  );
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
