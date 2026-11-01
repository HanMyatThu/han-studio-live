"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Lock, X } from "lucide-react";
import clsx from "clsx";
import type { PlayerEpisode } from "./player";

export function EpisodeSheet(props: { open: boolean; onClose: () => void; episodes: PlayerEpisode[]; current: number; slug: string; accent: string }) {
  const t = useTranslations("player");
  const td = useTranslations("drama");
  return (
    <AnimatePresence>
      {props.open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={props.onClose} className="absolute inset-0 z-30 bg-black/50" />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 z-40 max-h-[65%] overflow-y-auto rounded-t-3xl bg-ink-900/95 p-5 pb-8 backdrop-blur-xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">{t("allEpisodes")}</h3>
              <button onClick={props.onClose} className="grid size-8 place-items-center rounded-full bg-white/10" aria-label="Close"><X className="size-4" /></button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {props.episodes.map((e) => (
                <Link
                  key={e.id}
                  href={`/watch/${props.slug}/${e.number}`}
                  onClick={props.onClose}
                  className={clsx(
                    "relative grid aspect-square place-items-center rounded-xl text-sm font-bold ring-1 transition",
                    e.number === props.current ? "text-white ring-2" : "bg-white/5 ring-white/10 hover:bg-white/10",
                    e.access === "locked" && "text-white/35",
                  )}
                  style={e.number === props.current ? { background: `${props.accent}33`, ["--tw-ring-color" as string]: props.accent } : undefined}
                >
                  {e.number}
                  {e.access === "locked" && <Lock className="absolute right-1 top-1 size-3" />}
                  {e.access === "free" && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-emerald-400" title={td("free")} />}
                </Link>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
