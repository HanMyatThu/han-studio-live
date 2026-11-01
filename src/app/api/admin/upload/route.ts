import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { saveStream } from "@/lib/storage";
import { enqueueJob } from "@/lib/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Raw video upload (streamed to disk, so large files are fine).
 * Query: dramaId, mode=split|single, count (split), number (single / start number).
 */
export async function POST(req: Request) {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const dramaId = url.searchParams.get("dramaId") ?? "";
  const mode = url.searchParams.get("mode") === "split" ? "SPLIT" : "SINGLE";
  const count = Math.min(100, Math.max(1, parseInt(url.searchParams.get("count") || "1", 10)));
  const number = Math.max(1, parseInt(url.searchParams.get("number") || "1", 10));
  const name = (url.searchParams.get("name") || "video.mp4").replace(/[^\w.-]/g, "_");

  const drama = await db.drama.findUnique({ where: { id: dramaId } });
  if (!drama) return Response.json({ error: "Drama not found" }, { status: 404 });
  if (!req.body) return Response.json({ error: "Empty upload" }, { status: 400 });

  const sourceKey = `uploads/${dramaId}/${Date.now()}-${name}`;
  await saveStream(sourceKey, req.body);

  const job = await db.processingJob.create({
    data: { dramaId, kind: mode, sourceKey, targetCount: mode === "SPLIT" ? count : 1, startNumber: number },
  });
  enqueueJob(job.id);
  return Response.json({ jobId: job.id });
}
