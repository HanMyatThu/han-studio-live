"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Share2, VolumeX, Volume2, Play, ChevronRight, Film } from "lucide-react";
import clsx from "clsx";
import { Logo } from "../logo";
import { LikeButton } from "../player/like-button";
import { CommentsSheet } from "../player/comments-sheet";

export type FeedItem = {
  dramaId: string; slug: string; title: string; synopsis: string; genre: string; accent: string;
  episodes: number; episodeId: string; episodeNumber: number; src: string | null; poster: string | null;
  likes: number; liked: boolean; comments: number;
};

export function Feed({ items, loggedIn }: { items: FeedItem[]; loggedIn: boolean }) {
  const t = useTranslations("feed");
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index)); }),
      { root, threshold: 0.6 },
    );
    root.querySelectorAll("[data-index]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="grid h-dvh place-items-center text-center text-white/50">
        <div><Film className="mx-auto mb-3 size-10" />{t("empty")}</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <Link href="/" className="pointer-events-auto"><Logo /></Link>
        <span className="font-display text-sm font-bold">{t("title")}</span>
      </div>
      <div ref={container} className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain">
        {items.map((item, i) => (
          <FeedCard
            key={item.dramaId}
            item={item}
            index={i}
            active={i === active}
            preload={Math.abs(i - active) <= 1}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            loggedIn={loggedIn}
          />
        ))}
      </div>
    </div>
  );
}

function FeedCard(props: { item: FeedItem; index: number; active: boolean; preload: boolean; muted: boolean; onToggleMute: () => void; loggedIn: boolean }) {
  const { item } = props;
  const t = useTranslations("feed");
  const tp = useTranslations("player");
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [landscape, setLandscape] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState(item.comments);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (props.active) {
      v.play().then(() => setPaused(false)).catch(() => setPaused(true));
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [props.active]);

  useEffect(() => {
    if (video.current) video.current.muted = props.muted;
  }, [props.muted]);

  async function share() {
    const url = `${location.origin}/drama/${item.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: item.title, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    } catch {}
  }

  return (
    <section data-index={props.index} className="relative h-dvh w-full snap-start snap-always overflow-hidden">
      <div className="absolute inset-0" style={{ background: `radial-gradient(70% 50% at 50% 40%, ${item.accent}44, #000 75%)` }} />
      <div className="absolute inset-0 mx-auto max-w-[min(100vw,calc(100dvh*9/16))] sm:max-w-none">
        {item.src && (
          <video
            ref={video}
            src={props.preload ? item.src : undefined}
            poster={item.poster ?? undefined}
            muted={props.muted}
            loop
            playsInline
            preload={props.preload ? "auto" : "none"}
            onClick={() => {
              const v = video.current; if (!v) return;
              if (props.muted) { props.onToggleMute(); return; }
              if (v.paused) { v.play(); setPaused(false); } else { v.pause(); setPaused(true); }
            }}
            onLoadedMetadata={(e) => setLandscape(e.currentTarget.videoWidth > e.currentTarget.videoHeight)}
            onTimeUpdate={(e) => setProgress(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
            className={clsx("absolute inset-0 h-full w-full", landscape ? "object-contain" : "object-cover sm:object-contain")}
          />
        )}
      </div>

      <AnimatePresence>
        {props.active && props.muted && (
          <motion.button
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            onClick={props.onToggleMute}
            className="absolute left-1/2 top-20 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-xs font-semibold backdrop-blur"
          >
            <VolumeX className="size-4" /> {t("tapForSound")}
          </motion.button>
        )}
      </AnimatePresence>
      {paused && props.active && !props.muted && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/15 backdrop-blur-xl">
          <Play className="ml-1 size-9 fill-white" />
        </div>
      )}

      {/* Right rail */}
      <div className="absolute bottom-36 right-3 z-10 flex flex-col items-center gap-3 md:right-8">
        <LikeButton episodeId={item.episodeId} initialLiked={item.liked} initialCount={item.likes} />
        <button onClick={() => setCommentsOpen(true)} className="flex flex-col items-center gap-1 text-[11px] font-semibold drop-shadow">
          <span className="grid size-11 place-items-center rounded-full bg-black/30 backdrop-blur-md"><MessageCircle className="size-6" /></span>
          {comments}
        </button>
        <button onClick={share} className="flex flex-col items-center gap-1 text-[11px] font-semibold drop-shadow">
          <span className="grid size-11 place-items-center rounded-full bg-black/30 backdrop-blur-md"><Share2 className="size-5" /></span>
          {copied ? "✓" : tp("share")}
        </button>
        <button onClick={props.onToggleMute} className="grid size-11 place-items-center rounded-full bg-black/30 backdrop-blur-md" aria-label="Sound">
          {props.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
        </button>
      </div>

      {/* Info */}
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-28 pt-24 md:pb-10">
        <div className="mx-auto max-w-xl pr-16">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: item.accent }}>{item.genre} · {t("episodeOne")}</div>
          <h2 className="font-display mt-1 text-2xl font-extrabold leading-tight">{item.title}</h2>
          <p className="mt-1.5 line-clamp-2 text-sm text-white/70">{item.synopsis}</p>
          <Link
            href={`/watch/${item.slug}/${item.src?.startsWith("/api/stream") ? Math.min(item.episodeNumber + 1, item.episodes) : item.episodeNumber}`}
            className="bg-gradient-brand mt-4 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold shadow-[0_10px_30px_-10px_#ff3d81]"
          >
            {tp("watchDrama")} · {item.episodes} EP <ChevronRight className="size-4" />
          </Link>
        </div>
        <div className="mx-auto mt-4 h-0.5 max-w-xl overflow-hidden rounded-full bg-white/15">
          <div className="h-full bg-white/80" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <CommentsSheet
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        episodeId={item.episodeId}
        loggedIn={props.loggedIn}
        onCountChange={(d) => setComments((c) => Math.max(0, c + d))}
      />
    </section>
  );
}
