"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { removeFile } from "@/lib/storage";

async function guard() {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Unauthorized");
  return admin;
}

const DramaSchema = z.object({
  title: z.string().trim().min(1).max(160),
  titleMy: z.string().trim().max(160).optional().transform((v) => v || null),
  synopsis: z.string().trim().min(1).max(2000),
  synopsisMy: z.string().trim().max(2000).optional().transform((v) => v || null),
  genre: z.string().trim().min(1),
  tags: z.string().trim().max(300).default(""),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ff3d81"),
  freeEpisodes: z.coerce.number().int().min(0).max(100),
  featured: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export type DramaFormState = { error?: string; ok?: boolean } | undefined;

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "drama";

export async function createDrama(_: DramaFormState, form: FormData): Promise<DramaFormState> {
  await guard();
  const parsed = DramaSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`).join(", ") };
  let slug = slugify(parsed.data.title);
  if (await db.drama.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
  const drama = await db.drama.create({ data: { ...parsed.data, slug } });
  redirect(`/admin/dramas/${drama.id}`);
}

export async function updateDrama(id: string, _: DramaFormState, form: FormData): Promise<DramaFormState> {
  await guard();
  const parsed = DramaSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`).join(", ") };
  await db.drama.update({ where: { id }, data: parsed.data });
  revalidatePath(`/admin/dramas/${id}`);
  revalidatePath("/");
  return { ok: true };
}

export async function setPublished(id: string, published: boolean) {
  await guard();
  await db.drama.update({ where: { id }, data: { published } });
  revalidatePath(`/admin/dramas/${id}`);
  revalidatePath("/admin/dramas");
  revalidatePath("/");
}

export async function deleteDrama(id: string) {
  await guard();
  const eps = await db.episode.findMany({ where: { dramaId: id }, select: { videoKey: true } });
  await Promise.all(eps.map((e) => removeFile(e.videoKey).catch(() => {})));
  await db.drama.delete({ where: { id } });
  revalidatePath("/admin/dramas");
  redirect("/admin/dramas");
}

export async function approveEpisodes(dramaId: string, episodeIds?: string[]) {
  await guard();
  await db.episode.updateMany({
    where: { dramaId, status: "REVIEW", ...(episodeIds ? { id: { in: episodeIds } } : {}) },
    data: { status: "READY" },
  });
  revalidatePath(`/admin/dramas/${dramaId}`);
}

export async function deleteEpisode(id: string) {
  await guard();
  const ep = await db.episode.delete({ where: { id } });
  await removeFile(ep.videoKey).catch(() => {});
  revalidatePath(`/admin/dramas/${ep.dramaId}`);
}

export async function saveSubtitles(episodeId: string, lang: "en" | "my", vtt: string) {
  await guard();
  const text = vtt.trim().startsWith("WEBVTT") ? vtt : `WEBVTT\n\n${vtt}`;
  await db.episode.update({ where: { id: episodeId }, data: lang === "en" ? { subtitleEn: text } : { subtitleMy: text } });
  revalidatePath(`/admin/episodes/${episodeId}`);
  return { ok: true };
}
