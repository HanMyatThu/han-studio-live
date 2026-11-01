"use client";
import { useEffect, useState } from "react";
import clsx from "clsx";

export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={clsx(
        "fixed inset-x-0 top-0 z-40 transition-all duration-500",
        scrolled ? "border-b border-white/5 bg-ink-950/70 backdrop-blur-xl" : "bg-gradient-to-b from-black/60 to-transparent",
      )}
    >
      {children}
    </header>
  );
}
