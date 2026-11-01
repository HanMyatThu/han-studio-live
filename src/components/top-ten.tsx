import Link from "next/link";
import { getLocale } from "next-intl/server";
import type { DramaCardData } from "@/lib/queries";
import { localized } from "@/lib/format";
import { Poster } from "./poster";

export async function TopTen({ dramas }: { dramas: DramaCardData[] }) {
  const locale = await getLocale();
  return (
    <>
      {dramas.slice(0, 10).map((d, i) => (
        <Link key={d.id} href={`/drama/${d.slug}`} className="group relative flex shrink-0 snap-start items-end pl-10 sm:pl-14">
          <span
            className="font-display absolute bottom-[-12px] left-0 select-none text-[120px] font-extrabold leading-none text-transparent sm:text-[150px]"
            style={{ WebkitTextStroke: "2px rgba(255,255,255,0.28)" }}
          >
            {i + 1}
          </span>
          <div className="relative aspect-[2/3] w-[120px] overflow-hidden rounded-xl ring-1 ring-white/10 transition duration-500 group-hover:-translate-y-1 group-hover:ring-white/30 sm:w-[140px]">
            <Poster title={localized(locale, d.title, d.titleMy)} accent={d.accent} posterUrl={d.posterUrl} size="sm" className="h-full w-full" />
          </div>
        </Link>
      ))}
    </>
  );
}
