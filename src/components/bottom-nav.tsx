"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, Compass, Crown, User } from "lucide-react";
import clsx from "clsx";

export function BottomNav() {
  const t = useTranslations("nav");
  const path = usePathname();
  const items = [
    { href: "/", icon: Home, label: t("home") },
    { href: "/browse", icon: Compass, label: t("browse") },
    { href: "/subscribe", icon: Crown, label: "VIP" },
    { href: "/account", icon: User, label: t("account") },
  ];
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="glass flex items-center justify-around rounded-2xl bg-ink-900/70 px-2 py-2 shadow-2xl">
        {items.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link key={href} href={href} className={clsx("flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition", active ? "text-white" : "text-white/45")}>
              <Icon className={clsx("size-5", active && href === "/subscribe" && "text-amber-glow")} />
              {label}
              {active && <span className="bg-gradient-brand mt-0.5 h-0.5 w-4 rounded-full" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
