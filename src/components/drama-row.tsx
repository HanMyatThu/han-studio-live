import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function DramaRow({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  const t = await getTranslations("common");
  return (
    <section className="relative mx-auto max-w-7xl">
      <div className="mb-3 flex items-end justify-between px-4 md:px-8">
        <h2 className="font-display text-lg font-bold tracking-tight md:text-xl">{title}</h2>
        {href && (
          <Link href={href} className="flex items-center text-xs font-semibold text-white/50 hover:text-white">
            {t("seeAll")} <ChevronRight className="size-4" />
          </Link>
        )}
      </div>
      <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 md:scroll-px-8 md:gap-4 md:px-8">
        {children}
      </div>
    </section>
  );
}
