"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export type CommentView = { id: string; body: string; createdAt: string; user: { id: string; name: string }; mine: boolean };

export async function toggleLike(episodeId: string) {
  const user = await getCurrentUser();
  if (!user) return { needLogin: true as const };
  const key = { userId_episodeId: { userId: user.id, episodeId } };
  const existing = await db.episodeLike.findUnique({ where: key });
  const [, ep] = await db.$transaction(
    existing
      ? [db.episodeLike.delete({ where: key }), db.episode.update({ where: { id: episodeId }, data: { likesCount: { decrement: 1 } } })]
      : [db.episodeLike.create({ data: { userId: user.id, episodeId } }), db.episode.update({ where: { id: episodeId }, data: { likesCount: { increment: 1 } } })],
  );
  return { liked: !existing, count: Math.max(0, ep.likesCount) };
}

export async function listComments(episodeId: string, before?: string): Promise<CommentView[]> {
  const user = await getCurrentUser();
  const rows = await db.comment.findMany({
    where: { episodeId, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { user: { select: { id: true, name: true } } },
  });
  return rows.map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    user: c.user,
    mine: c.userId === user?.id || user?.role === "ADMIN",
  }));
}

const Body = z.string().trim().min(1).max(500);

export async function addComment(episodeId: string, body: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "login" as const };
  if (user.banned) return { error: "banned" as const };
  const parsed = Body.safeParse(body);
  if (!parsed.success) return { error: "invalid" as const };
  // Simple flood protection: one comment every 5 seconds per user.
  const last = await db.comment.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  if (last && Date.now() - last.createdAt.getTime() < 5000) return { error: "slow" as const };
  const c = await db.comment.create({ data: { episodeId, userId: user.id, body: parsed.data } });
  return { comment: { id: c.id, body: c.body, createdAt: c.createdAt.toISOString(), user: { id: user.id, name: user.name }, mine: true } satisfies CommentView };
}

export async function deleteComment(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "login" as const };
  const c = await db.comment.findUnique({ where: { id } });
  if (!c) return { ok: true };
  if (c.userId !== user.id && user.role !== "ADMIN") return { error: "forbidden" as const };
  await db.comment.delete({ where: { id } });
  return { ok: true };
}
