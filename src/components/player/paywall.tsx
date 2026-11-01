"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Crown, Lock, Check } from "lucide-react";

export function Paywall({ number, loggedIn }: { number: number; loggedIn: boolean }) {
  const t = useTranslations("player");
  const ts = useTranslations("subscribe");
  return (
    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black via-black/70 to-black/20">
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="glass m-3 w-full rounded-3xl bg-ink-900/70 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="bg-gradient-brand mx-auto grid size-14 place-items-center rounded-2xl shadow-[0_10px_40px_-8px_#ff3d81]">
          <Lock className="size-6" />
        </div>
        <h2 className="font-display mt-4 text-center text-2xl font-extrabold">{t("lockedTitle")}</h2>
        <p className="mt-2 text-center text-sm text-white/60">{t("lockedBody", { number })}</p>
        <ul className="mx-auto mt-5 grid max-w-xs gap-2 text-sm">
          {[ts("perks1"), ts("perks2"), ts("perks3")].map((p) => (
            <li key={p} className="flex items-center gap-2 text-white/80"><Check className="size-4 text-emerald-300" />{p}</li>
          ))}
        </ul>
        <Link href={loggedIn ? "/subscribe" : `/login?next=/subscribe`} className="bg-gradient-brand relative mt-6 flex w-full items-center justify-center gap-2 overflow-hidden rounded-full py-3.5 font-bold shadow-[0_10px_40px_-10px_#ff3d81]">
          <span className="shine absolute inset-0 animate-shimmer" />
          <Crown className="relative size-5" /> <span className="relative">{t("lockedCta")}</span>
        </Link>
      </motion.div>
    </div>
  );
}
