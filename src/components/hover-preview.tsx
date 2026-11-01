"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Muted preview clip that plays while the card is hovered (desktop),
 * or while it is in the middle of the screen (touch devices).
 */
export function HoverPreview({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const video = ref.current;
    const card = video?.closest("a");
    if (!video || !card) return;
    const touch = window.matchMedia("(hover: none)").matches;
    if (!touch) {
      const on = () => setActive(true);
      const off = () => setActive(false);
      card.addEventListener("mouseenter", on);
      card.addEventListener("mouseleave", off);
      return () => { card.removeEventListener("mouseenter", on); card.removeEventListener("mouseleave", off); };
    }
    const io = new IntersectionObserver(([e]) => setActive(e.intersectionRatio > 0.9), { threshold: [0, 0.9, 1], rootMargin: "0px -35% 0px -35%" });
    io.observe(card);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active) {
      if (!v.src) v.src = src;
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [active, src]);

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="none"
      className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${active ? "opacity-100" : "opacity-0"}`}
    />
  );
}
