import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Crown, Search, User, LayoutDashboard } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/access";
import { LocaleSwitcher } from "./locale-switcher";
import { HeaderShell } from "./header-shell";
import { Logo } from "./logo";

export async function Header() {
  const t = await getTranslations("nav");
  const user = await getCurrentUser();
  const sub = await getActiveSubscription(user?.id);
  return (
    <HeaderShell>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 md:px-8">
        <Link href="/" className="shrink-0"><Logo /></Link>
        <nav className="hidden items-center gap-1 text-sm font-medium text-white/70 md:flex">
          <Link href="/" className="rounded-full px-3 py-1.5 hover:bg-white/5 hover:text-white">{t("home")}</Link>
          <Link href="/feed" className="rounded-full px-3 py-1.5 hover:bg-white/5 hover:text-white">{t("feed")}</Link>
          <Link href="/browse" className="rounded-full px-3 py-1.5 hover:bg-white/5 hover:text-white">{t("browse")}</Link>
          {user && <Link href="/account#list" className="rounded-full px-3 py-1.5 hover:bg-white/5 hover:text-white">{t("myList")}</Link>}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/browse" aria-label={t("browse")} className="grid size-9 place-items-center rounded-full text-white/70 hover:bg-white/5 hover:text-white md:hidden">
            <Search className="size-[18px]" />
          </Link>
          <LocaleSwitcher className="hidden sm:flex" />
          {user?.role === "ADMIN" && (
            <Link href="/admin" className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-white/70 hover:bg-white/5 hover:text-white sm:flex">
              <LayoutDashboard className="size-4" /> {t("admin")}
            </Link>
          )}
          {!sub && (
            <Link href="/subscribe" className="bg-gradient-brand group relative flex items-center gap-1.5 overflow-hidden rounded-full px-4 py-2 text-sm font-bold text-white shadow-[0_8px_30px_-8px_#ff3d81]">
              <span className="shine absolute inset-0 animate-shimmer" />
              <Crown className="relative size-4" /> <span className="relative hidden sm:inline">{t("subscribe")}</span><span className="relative sm:hidden">VIP</span>
            </Link>
          )}
          {sub && (
            <span className="flex items-center gap-1 rounded-full border border-amber-glow/30 bg-amber-glow/10 px-3 py-1.5 text-xs font-bold text-amber-glow">
              <Crown className="size-3.5" /> VIP
            </span>
          )}
          <Link
            href={user ? "/account" : "/login"}
            className="glass grid size-9 place-items-center rounded-full text-sm font-bold"
            aria-label={user ? t("account") : t("login")}
          >
            {user ? user.name.slice(0, 1).toUpperCase() : <User className="size-4" />}
          </Link>
        </div>
      </div>
    </HeaderShell>
  );
}
