"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { toggleLike } from "@/app/actions/social";
import { compact } from "@/lib/format";

/** Heart with count. Optimistic: updates instantly, then syncs with the server. */
export function LikeButton({ episodeId, initialLiked, initialCount }: { episodeId: string; initialLiked: boolean; initialCount: number }) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [burst, setBurst] = useState(0);

  async function onClick() {
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    if (next) setBurst((b) => b + 1);
    const res = await toggleLike(episodeId);
    if ("needLogin" in res) {
      setLiked(!next);
      setCount((c) => c + (next ? -1 : 1));
      router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
    } else {
      setLiked(res.liked);
      setCount(res.count);
    }
  }

  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 text-[11px] font-semibold text-white drop-shadow" aria-pressed={liked} aria-label="Like">
      <span className="relative grid size-11 place-items-center rounded-full bg-black/30 backdrop-blur-md transition active:scale-90">
        <motion.span key={burst} initial={burst ? { scale: 0.4 } : false} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 12 }}>
          <Heart className={liked ? "size-6 fill-rose-glow text-rose-glow" : "size-6"} />
        </motion.span>
        {burst > 0 && liked && (
          <motion.span key={`r${burst}`} initial={{ scale: 0.6, opacity: 0.8 }} animate={{ scale: 1.8, opacity: 0 }} transition={{ duration: 0.6 }} className="absolute inset-0 rounded-full ring-2 ring-rose-glow" />
        )}
      </span>
      {compact(count)}
    </button>
  );
}
