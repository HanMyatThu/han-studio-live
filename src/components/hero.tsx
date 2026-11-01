"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Info, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Poster } from "./poster";

export type HeroItem = {
  slug: string; title: string; synopsis: string; genre: string; accent: string;
  posterUrl: string | null; episodes: number; freeEpisodes: number; tags: string;
};

export function Hero({ items }: { items: HeroItem[] }) {
  const t = useTranslations("home");
  const [index, setIndex] = useState(0);
  const item = items[index];

  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), 7000);
    return () => clearInterval(id);
  }, [items.length]);

  if (!item) return null;

  return (
    <section className="relative isolate min-h-[620px] overflow-hidden md:min-h-[680px]">
      {/* Animated backdrop */}
      <AnimatePresence mode="sync">
        <motion.div
          key={item.slug}
          className="absolute inset-0 -z-10"
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="absolute inset-0" style={{ background: `radial-gradient(70% 60% at 75% 30%, ${item.accent}55, transparent 70%)` }} />
          <div className="animate-aurora absolute -right-40 -top-40 size-[680px] rounded-full opacity-50 blur-3xl" style={{ background: `conic-gradient(from 90deg, ${item.accent}, #8b5cf6, transparent, ${item.accent})` }} />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950 via-ink-950/60 to-transparent" />

      <div className="mx-auto flex max-w-7xl flex-col-reverse items-center gap-10 px-4 pb-16 pt-28 md:flex-row md:items-end md:px-8 md:pt-36">
        <div className="w-full flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={item.slug}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-white" style={{ background: `${item.accent}33`, boxShadow: `inset 0 0 0 1px ${item.accent}66` }}>
                  <Sparkles className="size-3" /> {item.genre}
                </span>
                <span className="glass rounded-full px-2.5 py-1 text-white/80">{t("episodes", { count: item.episodes })}</span>
                <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-emerald-300 ring-1 ring-emerald-400/30">{t("freeEpisodes", { count: item.freeEpisodes })}</span>
              </div>
              <h1 className="font-display max-w-2xl text-4xl font-extrabold leading-[1.02] tracking-tight drop-shadow-2xl sm:text-5xl md:text-6xl lg:text-7xl">
                {item.title}
              </h1>
              <p className="mt-5 line-clamp-3 max-w-xl text-base text-white/70 md:text-lg">{item.synopsis}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={`/watch/${item.slug}/1`} className="group flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-bold text-ink-950 shadow-[0_10px_40px_-10px_rgba(255,255,255,0.6)] transition hover:scale-[1.03]">
                  <Play className="size-5 fill-current transition group-hover:scale-110" /> {t("watchNow")}
                </Link>
                <Link href={`/drama/${item.slug}`} className="glass flex items-center gap-2 rounded-full px-6 py-3.5 font-semibold transition hover:bg-white/10">
                  <Info className="size-5" /> {t("details")}
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
          {items.length > 1 && (
            <div className="mt-10 flex gap-2">
              {items.map((it, i) => (
                <button key={it.slug} onClick={() => setIndex(i)} className="relative h-1.5 w-10 overflow-hidden rounded-full bg-white/15" aria-label={it.title}>
                  {i === index && <motion.span layoutId="hero-dot" className="bg-gradient-brand absolute inset-0 rounded-full" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative w-[230px] shrink-0 sm:w-[260px] md:w-[300px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={item.slug}
              initial={{ opacity: 0, rotate: -6, y: 30, scale: 0.92 }}
              animate={{ opacity: 1, rotate: 3, y: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 8, y: -20, scale: 0.95 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="animate-float"
            >
              <div className="absolute -inset-6 -z-10 rounded-[40px] opacity-70 blur-3xl" style={{ background: item.accent }} />
              <div className="aspect-[9/16] overflow-hidden rounded-[28px] ring-1 ring-white/20 shadow-2xl">
                <Poster title={item.title} accent={item.accent} posterUrl={item.posterUrl} genre={item.genre} size="lg" className="h-full w-full" />
              </div>
              <div className="glass absolute -bottom-4 -left-8 flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold shadow-xl">
                <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-glow opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-rose-glow" /></span>
                မြန်မာစာတန်းထိုး · EN
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
