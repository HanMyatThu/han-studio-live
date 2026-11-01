import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { AdminDeleteComment } from "@/components/admin/delete-comment";

export default async function AdminComments({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const t = await getTranslations("admin");
  const comments = await db.comment.findMany({
    where: q ? { body: { contains: q } } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, email: true } }, episode: { select: { number: true, drama: { select: { title: true, slug: true } } } } },
  });
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">{t("comments")}</h1>
      <form className="mt-5">
        <input name="q" defaultValue={q} placeholder="Search comments…" className="w-full rounded-xl bg-white/5 px-4 py-2.5 outline-none ring-1 ring-white/10 focus:ring-rose-glow/60" />
      </form>
      <div className="glass mt-4 divide-y divide-white/5 overflow-hidden rounded-2xl">
        {comments.length === 0 && <p className="p-6 text-center text-sm text-white/45">{t("noComments")}</p>}
        {comments.map((c) => (
          <div key={c.id} className="flex items-start gap-3 p-4">
            <span className="bg-gradient-brand grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold">{c.user.name.slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 text-xs text-white/45">
                <span className="font-semibold text-white/80">{c.user.name}</span>
                <span>{c.user.email}</span>·
                <Link href={`/watch/${c.episode.drama.slug}/${c.episode.number}`} className="hover:text-white">
                  {c.episode.drama.title} · {t("episodeShort", { number: c.episode.number })}
                </Link>·
                <span>{c.createdAt.toLocaleString()}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm">{c.body}</p>
            </div>
            <AdminDeleteComment id={c.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
