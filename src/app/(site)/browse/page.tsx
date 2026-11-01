import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import clsx from "clsx";
import { getPublishedDramas, GENRES } from "@/lib/queries";
import { DramaCard } from "@/components/drama-card";

export const metadata = { title: "Browse" };

export default async function BrowsePage({ searchParams }: { searchParams: Promise<{ genre?: string; q?: string }> }) {
  const { genre, q } = await searchParams;
  const [t, tg] = await Promise.all([getTranslations("browse"), getTranslations("genres")]);
  const dramas = await getPublishedDramas({ genre, q: q?.trim() || undefined });
  const qs = (g?: string) => `/browse?${new URLSearchParams({ ...(g ? { genre: g } : {}), ...(q ? { q } : {}) })}`;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-24 md:px-8 md:pt-28">
      <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">{t("title")}</h1>
      <form className="glass mt-6 flex items-center gap-3 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-rose-glow/50" action="/browse">
        <Search className="size-5 text-white/40" />
        {genre && <input type="hidden" name="genre" value={genre} />}
        <input name="q" defaultValue={q} placeholder={t("search")} className="w-full bg-transparent outline-none placeholder:text-white/35" />
      </form>
      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
        {[undefined, ...GENRES].map((g) => (
          <Link
            key={g ?? "all"}
            href={qs(g)}
            className={clsx(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
              genre === g ? "bg-white text-ink-950" : "glass text-white/70 hover:text-white",
            )}
          >
            {g ? tg(g) : t("all")}
          </Link>
        ))}
      </div>
      {dramas.length === 0 ? (
        <p className="mt-16 text-center text-white/50">{t("noResults")}</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 [&>a]:w-auto">
          {dramas.map((d) => <DramaCard key={d.id} drama={d} />)}
        </div>
      )}
    </div>
  );
}
