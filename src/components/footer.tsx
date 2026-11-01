import { getTranslations } from "next-intl/server";
import { Logo } from "./logo";
import { LocaleSwitcher } from "./locale-switcher";

export async function Footer() {
  const t = await getTranslations("brand");
  return (
    <footer className="mt-24 border-t border-white/5 pb-28 pt-12 md:pb-12">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 md:flex-row md:items-center md:px-8">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-white/45">{t("tagline")}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-white/40">
          <LocaleSwitcher />
          <span>© {new Date().getFullYear()} Zat</span>
        </div>
      </div>
    </footer>
  );
}
