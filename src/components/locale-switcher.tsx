"use client";
import { useLocale } from "next-intl";
import { useTransition } from "react";
import clsx from "clsx";
import { setLocale } from "@/app/actions/locale";

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const [pending, start] = useTransition();
  return (
    <div className={clsx("glass relative inline-flex w-fit rounded-full p-0.5 text-xs font-semibold", pending && "opacity-60", className)}>
      {(["en", "my"] as const).map((l) => (
        <button
          key={l}
          onClick={() => start(() => setLocale(l))}
          className={clsx(
            "relative z-10 rounded-full px-3 py-1.5 transition-colors",
            locale === l ? "bg-white text-ink-950" : "text-white/60 hover:text-white",
          )}
          aria-pressed={locale === l}
        >
          {l === "en" ? "EN" : "မြန်မာ"}
        </button>
      ))}
    </div>
  );
}
