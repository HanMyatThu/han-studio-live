"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export function AdminNavLink({ href, icon, children, exact }: { href: string; icon: React.ReactNode; children: React.ReactNode; exact?: boolean }) {
  const path = usePathname();
  const active = exact ? path === href : path.startsWith(href) && !path.endsWith("/new");
  return (
    <Link
      href={href}
      className={clsx(
        "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
        active ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5 hover:text-white",
      )}
    >
      {icon} {children}
    </Link>
  );
}
