import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LayoutDashboard, Clapperboard, Plus, ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { AdminNavLink } from "@/components/admin/nav-link";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/login?next=/admin");
  const t = await getTranslations("admin");
  return (
    <div className="min-h-dvh bg-ink-950 md:flex">
      <aside className="border-b border-white/5 bg-ink-900/60 md:sticky md:top-0 md:h-dvh md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between p-5">
          <Link href="/admin" className="flex items-center gap-2"><Logo /><span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/60">{t("title")}</span></Link>
        </div>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          <AdminNavLink href="/admin" exact icon={<LayoutDashboard className="size-4" />}>{t("dashboard")}</AdminNavLink>
          <AdminNavLink href="/admin/dramas" icon={<Clapperboard className="size-4" />}>{t("dramas")}</AdminNavLink>
          <Link href="/admin/dramas/new" className="bg-gradient-brand mt-2 flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold shadow-[0_8px_30px_-10px_#ff3d81]">
            <Plus className="size-4" /> {t("newDrama")}
          </Link>
        </nav>
        <div className="hidden p-5 md:absolute md:bottom-0 md:block md:w-64">
          <LocaleSwitcher />
          <Link href="/" className="mt-4 flex items-center gap-1.5 text-xs text-white/40 hover:text-white">
            <ExternalLink className="size-3.5" /> View site
          </Link>
          <div className="mt-2 truncate text-xs text-white/30">{admin.email}</div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-10">{children}</main>
    </div>
  );
}
