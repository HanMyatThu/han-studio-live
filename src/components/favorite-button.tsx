"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { toggleFavorite } from "@/app/actions/viewer";

export function FavoriteButton({ dramaId, initial }: { dramaId: string; initial: boolean }) {
  const t = useTranslations("drama");
  const router = useRouter();
  const [fav, setFav] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await toggleFavorite(dramaId);
          if ("needLogin" in res) router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
          else setFav(res.favorite);
        })
      }
      className="glass flex items-center gap-2 rounded-full px-5 py-3.5 font-semibold transition hover:bg-white/10"
    >
      <motion.span key={String(fav)} initial={{ scale: 0.4, rotate: -90 }} animate={{ scale: 1, rotate: 0 }}>
        {fav ? <Check className="size-5 text-emerald-300" /> : <Plus className="size-5" />}
      </motion.span>
      {fav ? t("inList") : t("addToList")}
    </button>
  );
}
