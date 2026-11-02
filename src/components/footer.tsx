import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Mail } from "lucide-react";
import { Logo } from "./logo";
import { LocaleSwitcher } from "./locale-switcher";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export async function Footer() {
  const t = await getTranslations("brand");
  const f = await getTranslations("footer");
  const links = [
    { href: "/faq", label: f("faq") },
    { href: "/terms", label: f("terms") },
    { href: "/privacy", label: f("privacy") },
  ];
  return (
    <footer className="mt-24 border-t border-white/5 pb-28 pt-12 md:pb-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 md:flex-row md:items-start md:justify-between md:px-8">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-white/45">{t("tagline")}</p>
        </div>
        <nav className="flex flex-col gap-3 text-sm md:items-end">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="text-white/60 transition hover:text-white">{l.label}</Link>
            ))}
          </div>
          <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 text-white/60 transition hover:text-white">
            <Mail className="size-4" /> {f("contact")}: <span className="text-white/80">{CONTACT_EMAIL}</span>
          </a>
        </nav>
      </div>
      <div className="mx-auto mt-8 flex max-w-7xl items-center justify-between gap-4 border-t border-white/5 px-4 pt-6 text-xs text-white/40 md:px-8">
        <span>© {new Date().getFullYear()} {SITE_NAME}</span>
        <LocaleSwitcher />
      </div>
    </footer>
  );
}
