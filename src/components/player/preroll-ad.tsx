"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Crown, Sparkles } from "lucide-react";

const SKIP_AFTER = 5;
const AD_LENGTH = 10;

/**
 * Pre-roll ad for free viewers. This is a simulated ad.
 * To go live, load Google IMA SDK with NEXT_PUBLIC_IMA_AD_TAG_URL here
 * (https://developers.google.com/interactive-media-ads/docs/sdks/html5).
 */
export function PrerollAd({ onDone }: { onDone: () => void }) {
  const t = useTranslations("player");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (elapsed >= AD_LENGTH) onDone();
  }, [elapsed, onDone]);

  const canSkip = elapsed >= SKIP_AFTER;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 overflow-hidden bg-ink-950">
      <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_30%_20%,#22d3ee55,transparent_60%),radial-gradient(70%_60%_at_80%_80%,#8b5cf666,transparent_60%)]" />
      <div className="absolute inset-0 grid place-items-center p-8 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}>
          <Sparkles className="mx-auto size-10 text-cyan-300" />
          <div className="font-display mt-4 text-3xl font-extrabold">Your brand here</div>
          <p className="mt-2 text-sm text-white/60">Demo video ad · Google Ad Manager</p>
        </motion.div>
      </div>
      <div className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-xs font-bold backdrop-blur">
        <span className="rounded bg-amber-glow px-1.5 text-[10px] text-ink-950">{t("adLabel")}</span>
        {AD_LENGTH - elapsed}s
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
        <div className="h-full bg-amber-glow transition-all duration-1000 ease-linear" style={{ width: `${(elapsed / AD_LENGTH) * 100}%` }} />
      </div>
      <div className="absolute bottom-8 left-4 right-4 flex items-center justify-between gap-3">
        <Link href="/subscribe" className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-2 text-xs font-semibold text-amber-glow backdrop-blur">
          <Crown className="size-3.5" /> {t("adRemove")}
        </Link>
        <button
          disabled={!canSkip}
          onClick={onDone}
          className="rounded-full bg-white px-4 py-2 text-sm font-bold text-ink-950 transition disabled:bg-white/20 disabled:text-white/70"
        >
          {canSkip ? `${t("adSkip")} ›` : t("adSkipIn", { seconds: SKIP_AFTER - elapsed })}
        </button>
      </div>
    </motion.div>
  );
}
