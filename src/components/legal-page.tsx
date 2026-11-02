import { getTranslations } from "next-intl/server";
import { Mail } from "lucide-react";
import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/site";

type Section = { h: string; p: string };

/** Terms / privacy style page: title, intro and numbered sections from messages. */
export async function LegalPage({ page }: { page: "terms" | "privacy" }) {
  const t = await getTranslations("pages");
  const sections = t.raw(`${page}.sections`) as Record<string, Section>;
  const withEmail = (s: string) => s.replaceAll("{email}", CONTACT_EMAIL);
  return (
    <article className="mx-auto max-w-3xl px-4 pt-28 md:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">{t("updated", { date: LEGAL_UPDATED })}</p>
      <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight md:text-5xl">{t(`${page}.title`)}</h1>
      <p className="mt-4 text-lg text-white/60">{t(`${page}.intro`)}</p>
      <ol className="mt-10 space-y-4">
        {Object.entries(sections).map(([key, s], i) => (
          <li key={key} className="glass rounded-2xl p-5 md:p-6">
            <h2 className="flex items-baseline gap-3 font-display text-lg font-bold">
              <span className="text-gradient font-extrabold">{String(i + 1).padStart(2, "0")}</span>
              {s.h}
            </h2>
            <p className="mt-2 leading-relaxed text-white/65">{withEmail(s.p)}</p>
          </li>
        ))}
      </ol>
      <ContactCard />
    </article>
  );
}

export async function ContactCard() {
  const t = await getTranslations("pages");
  return (
    <a
      href={`mailto:${CONTACT_EMAIL}`}
      className="glass mt-10 flex items-center gap-4 rounded-2xl p-5 transition hover:bg-white/[0.07]"
    >
      <span className="bg-gradient-brand grid size-11 shrink-0 place-items-center rounded-xl"><Mail className="size-5" /></span>
      <span>
        <span className="block font-semibold">{t("contact")}</span>
        <span className="text-sm text-white/55">{CONTACT_EMAIL}</span>
      </span>
    </a>
  );
}
