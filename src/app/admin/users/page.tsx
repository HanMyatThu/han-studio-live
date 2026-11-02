import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { UserRowActions } from "@/components/admin/user-row-actions";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string }> }) {
  const { q, filter } = await searchParams;
  const t = await getTranslations("admin");
  const me = await requireAdmin();
  const now = new Date();
  const users = await db.user.findMany({
    where: {
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
      ...(filter === "admins" ? { role: "ADMIN" } : filter === "banned" ? { banned: true } : filter === "vip" ? { subscriptions: { some: { endsAt: { gt: now } } } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      subscriptions: { where: { endsAt: { gt: now } }, orderBy: { endsAt: "desc" }, take: 1 },
      _count: { select: { comments: true, likes: true } },
    },
  });
  const filters = [["", "All"], ["vip", "VIP"], ["admins", "Admins"], ["banned", t("banned")]] as const;

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">{t("users")} <span className="text-white/35">· {users.length}</span></h1>
      <form className="mt-5 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder={t("searchUsers")} className="min-w-60 flex-1 rounded-xl bg-white/5 px-4 py-2.5 outline-none ring-1 ring-white/10 focus:ring-rose-glow/60" />
        {filter && <input type="hidden" name="filter" value={filter} />}
      </form>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        {filters.map(([value, label]) => (
          <a
            key={value}
            href={`/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(value ? { filter: value } : {}) })}`}
            className={(filter ?? "") === value ? "rounded-full bg-white px-3.5 py-1.5 font-semibold text-ink-950" : "glass rounded-full px-3.5 py-1.5 text-white/70 hover:text-white"}
          >
            {label}
          </a>
        ))}
      </div>
      <div className="glass mt-5 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs text-white/45">
            <tr className="border-b border-white/5">
              <th className="px-4 py-3 font-semibold">{t("users")}</th>
              <th className="px-4 py-3 font-semibold">{t("role")}</th>
              <th className="px-4 py-3 font-semibold">{t("pass")}</th>
              <th className="px-4 py-3 font-semibold">♥ / 💬</th>
              <th className="px-4 py-3 font-semibold">{t("joined")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((u) => (
              <tr key={u.id} className={u.banned ? "opacity-60" : ""}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="bg-gradient-brand grid size-9 shrink-0 place-items-center rounded-full font-bold">{u.name.slice(0, 1).toUpperCase()}</span>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">
                        {u.name} {u.id === me?.id && <span className="ml-1 rounded bg-white/10 px-1.5 text-[10px] text-white/60">{t("you")}</span>}
                        {u.banned && <span className="ml-1 rounded bg-rose-500/20 px-1.5 text-[10px] text-rose-300">{t("banned")}</span>}
                      </div>
                      <div className="truncate text-xs text-white/45">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={u.role === "ADMIN" ? "rounded-full bg-violet-glow/20 px-2 py-0.5 text-[11px] font-bold text-violet-300" : "text-white/50"}>{u.role}</span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {u.subscriptions[0] ? <span className="text-amber-glow">VIP → {u.subscriptions[0].endsAt.toLocaleDateString()}</span> : <span className="text-white/35">{t("none")}</span>}
                </td>
                <td className="px-4 py-3 text-xs text-white/60">{u._count.likes} / {u._count.comments}</td>
                <td className="px-4 py-3 text-xs text-white/50">{u.createdAt.toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  {u.id !== me?.id && <UserRowActions id={u.id} role={u.role} banned={u.banned} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
