"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { removeDir, removeFile } from "@/lib/storage";

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
  const drama = await db.drama.findUnique({
    where: { id },
    select: { posterUrl: true, previewKey: true, episodes: { select: { streamId: true } }, jobs: { select: { sourceKey: true } } },
  });
  if (!drama) redirect("/admin/dramas");

  // 1. Videos on Bunny Stream (keep going if one fails, e.g. already deleted there).
  const { deleteVideo, bunnyEnabled } = await import("@/lib/bunny");
  if (bunnyEnabled()) {
    await Promise.all(drama.episodes.filter((e) => e.streamId).map((e) => deleteVideo(e.streamId!).catch(() => {})));
  }

  // 2. Files on this server: episodes, thumbnails, preview clip, poster, leftover uploads.
  const posterKey = drama.posterUrl?.replace(/^\/api\/(media\/)?/, "");
  await Promise.all([
    removeDir(`dramas/${id}`),
    removeDir(`thumbs/${id}`),
    removeFile(drama.previewKey),
    posterKey?.startsWith("posters/") ? removeFile(posterKey) : null,
    ...drama.jobs.map((j) => removeFile(j.sourceKey)),
  ].map((p) => p?.catch(() => {})));

  // 3. Database rows (episodes, likes, comments, progress, favorites cascade).
  await db.drama.delete({ where: { id } });
  revalidatePath("/admin/dramas");
  revalidatePath("/");
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
  await removeFile(ep.thumbKey).catch(() => {});
  const { deleteVideo, bunnyEnabled } = await import("@/lib/bunny");
  if (ep.streamId && bunnyEnabled()) await deleteVideo(ep.streamId).catch(() => {});
  revalidatePath(`/admin/dramas/${ep.dramaId}`);
}

export async function saveSubtitles(episodeId: string, lang: "en" | "my", vtt: string) {
  await guard();
  const text = vtt.trim().startsWith("WEBVTT") ? vtt : `WEBVTT\n\n${vtt}`;
  await db.episode.update({ where: { id: episodeId }, data: lang === "en" ? { subtitleEn: text } : { subtitleMy: text } });
  revalidatePath(`/admin/episodes/${episodeId}`);
  return { ok: true };
}

export async function regenerateArtwork(dramaId: string) {
  await guard();
  const { generateDramaArtwork, generateEpisodeThumb } = await import("@/lib/artwork");
  const eps = await db.episode.findMany({ where: { dramaId }, select: { id: true } });
  for (const e of eps) await generateEpisodeThumb(e.id).catch(() => {});
  await generateDramaArtwork(dramaId, { force: true });
  revalidatePath(`/admin/dramas/${dramaId}`);
  revalidatePath("/");
}

/** Create thumbnails, posters and previews for anything that doesn't have them yet. */
export async function generateMissingArtwork() {
  await guard();
  const { generateDramaArtwork, generateEpisodeThumb } = await import("@/lib/artwork");
  const eps = await db.episode.findMany({ where: { thumbKey: null }, select: { id: true } });
  for (const e of eps) await generateEpisodeThumb(e.id).catch(() => {});
  const dramas = await db.drama.findMany({ where: { OR: [{ previewKey: null }, { posterUrl: null }] }, select: { id: true } });
  for (const d of dramas) await generateDramaArtwork(d.id).catch(() => {});
  revalidatePath("/", "layout");
  return { episodes: eps.length, dramas: dramas.length };
}

export async function setUserRole(userId: string, role: "USER" | "ADMIN") {
  const admin = await guard();
  if (userId === admin.id) throw new Error("You can't change your own role");
  await db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
}

export async function setUserBanned(userId: string, banned: boolean) {
  const admin = await guard();
  if (userId === admin.id) throw new Error("You can't ban yourself");
  await db.user.update({ where: { id: userId }, data: { banned } });
  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string) {
  const admin = await guard();
  if (userId === admin.id) throw new Error("You can't delete yourself");
  // Keep like counts accurate before the user's likes are removed.
  const likes = await db.episodeLike.findMany({ where: { userId }, select: { episodeId: true } });
  for (const l of likes) await db.episode.update({ where: { id: l.episodeId }, data: { likesCount: { decrement: 1 } } });
  await db.user.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
}

/** Move a drama's existing local episodes to Bunny Stream (runs in the background). */
export async function moveDramaToBunny(dramaId: string) {
  await guard();
  const { bunnyEnabled } = await import("@/lib/bunny");
  if (!bunnyEnabled()) return { error: "Bunny Stream is not set up yet. Add the BUNNY_* keys to .env and set STORAGE_DRIVER=\"bunny\"." };
  const { enqueueJob } = await import("@/lib/pipeline");
  const job = await db.processingJob.create({ data: { dramaId, kind: "BUNNY", sourceKey: "" } });
  enqueueJob(job.id);
  return { ok: true };
}

/** Run a failed job again, reusing the uploaded video still on the server. */
export async function retryJob(jobId: string) {
  await guard();
  const job = await db.processingJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== "FAILED") return { error: "This job can't be retried." };
  const { exists } = await import("@/lib/storage");
  if (job.kind !== "BUNNY" && !exists(job.sourceKey)) return { error: "The uploaded video is gone. Please upload it again." };
  await db.processingJob.update({ where: { id: jobId }, data: { status: "QUEUED", progress: 0, error: null, step: "Queued again" } });
  const { enqueueJob } = await import("@/lib/pipeline");
  enqueueJob(jobId);
  return { ok: true };
}
