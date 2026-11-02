import fsp from "node:fs/promises";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { exists, fileSize, partKey, storagePath } from "@/lib/storage";
import { enqueueJob } from "@/lib/pipeline";

export const runtime = "nodejs";

/**
 * Finish a chunked upload and start processing.
 * Query: dramaId, uploadId, size, mode=split|single, count (split), number (single / start number), name.
 */
export async function POST(req: Request) {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const dramaId = url.searchParams.get("dramaId") ?? "";
  const uploadId = url.searchParams.get("uploadId") ?? "";
  const size = Number(url.searchParams.get("size"));
  const mode = url.searchParams.get("mode") === "split" ? "SPLIT" : "SINGLE";
  const count = Math.min(100, Math.max(1, parseInt(url.searchParams.get("count") || "1", 10)));
  const number = Math.max(1, parseInt(url.searchParams.get("number") || "1", 10));
  const name = (url.searchParams.get("name") || "video.mp4").replace(/[^\w.-]/g, "_").slice(-80);

  if (!/^\w+$/.test(dramaId) || !/^[a-f0-9-]{36}$/.test(uploadId)) return Response.json({ error: "Bad request" }, { status: 400 });
  const drama = await db.drama.findUnique({ where: { id: dramaId } });
  if (!drama) return Response.json({ error: "Drama not found" }, { status: 404 });

  const part = partKey(dramaId, uploadId);
  if (!exists(part) || (await fileSize(part)) !== size) {
    return Response.json({ error: "Upload is incomplete. Please try again." }, { status: 409 });
  }
  const sourceKey = `uploads/${dramaId}/${Date.now()}-${name}`;
  await fsp.rename(storagePath(part), storagePath(sourceKey));

  const job = await db.processingJob.create({
    data: { dramaId, kind: mode, sourceKey, targetCount: mode === "SPLIT" ? count : 1, startNumber: number },
  });
  enqueueJob(job.id);
  return Response.json({ jobId: job.id });
}
