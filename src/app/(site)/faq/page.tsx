import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ChevronDown } from "lucide-react";
import { ContactCard } from "@/components/legal-page";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "FAQ" };

export default async function FaqPage() {
  const t = await getTranslations("pages");
  const items = t.raw("faq.items") as Record<string, { q: string; a: string }>;
  return (
    <div className="mx-auto max-w-3xl px-4 pt-28 md:px-8">
      <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">{t("faq.title")}</h1>
      <p className="mt-4 text-lg text-white/60">{t("faq.intro", { email: CONTACT_EMAIL })}</p>
      <div className="mt-10 space-y-3">
        {Object.entries(items).map(([key, item], i) => (
          <details key={key} open={i === 0} className="glass group rounded-2xl [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold">
              {item.q}
              <ChevronDown className="size-5 shrink-0 text-white/40 transition group-open:rotate-180" />
            </summary>
            <p className="px-5 pb-5 leading-relaxed text-white/65">{item.a}</p>
          </details>
        ))}
      </div>
      <ContactCard />
    </div>
  );
}
