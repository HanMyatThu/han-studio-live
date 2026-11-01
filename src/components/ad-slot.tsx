"use client";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Megaphone } from "lucide-react";

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

/**
 * Google AdSense banner. Shows a styled placeholder until
 * NEXT_PUBLIC_ADSENSE_CLIENT is set. Only rendered for non-VIP users.
 */
export function AdSlot({ slot = "home-banner", className = "" }: { slot?: string; className?: string }) {
  const t = useTranslations("ads");
  const ref = useRef<HTMLModElement>(null);
  useEffect(() => {
    if (!CLIENT || !ref.current) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {}
  }, []);

  if (CLIENT) {
    return (
      <ins ref={ref} className={`adsbygoogle block ${className}`} data-ad-client={CLIENT} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
    );
  }
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-dashed border-white/10 bg-white/[0.02] ${className}`}>
      <div className="flex h-full min-h-20 items-center justify-center gap-2 px-4 text-xs text-white/35">
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/50">{t("sponsored")}</span>
        <Megaphone className="size-3.5" /> {t("placeholder")}
      </div>
    </div>
  );
}
