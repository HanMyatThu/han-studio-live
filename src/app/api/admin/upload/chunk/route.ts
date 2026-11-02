import fsp from "node:fs/promises";
import { requireAdmin } from "@/lib/auth";
import { ensureDir, exists, fileSize, partKey, storagePath } from "@/lib/storage";

export const runtime = "nodejs";

const ID = /^[a-f0-9-]{36}$/;
const MAX_CHUNK = 32 * 1024 * 1024;

/**
 * One piece of a large upload. The browser sends the file in small chunks so a
 * dropped connection only costs one chunk: it retries, or asks where to resume.
 * Query: dramaId, uploadId, offset (byte position of this chunk).
 * Reply: { size } = bytes received so far. 409 means "resume from size".
 */
export async function PUT(req: Request) {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const dramaId = url.searchParams.get("dramaId") ?? "";
  const uploadId = url.searchParams.get("uploadId") ?? "";
  const offset = Number(url.searchParams.get("offset"));
  if (!/^\w+$/.test(dramaId) || !ID.test(uploadId) || !Number.isInteger(offset) || offset < 0) {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }

  const key = partKey(dramaId, uploadId);
  const size = exists(key) ? await fileSize(key) : 0;
  if (offset !== size) return Response.json({ size }, { status: 409 });

  // Read the whole chunk first: if the connection drops mid-chunk nothing is written.
  const data = Buffer.from(await req.arrayBuffer());
  if (data.length === 0 || data.length > MAX_CHUNK) return Response.json({ error: "Bad chunk" }, { status: 400 });
  await ensureDir(key);
  await fsp.appendFile(storagePath(key), data);
  return Response.json({ size: size + data.length });
}

/** How much of an upload has arrived (used to resume). */
export async function GET(req: Request) {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const dramaId = url.searchParams.get("dramaId") ?? "";
  const uploadId = url.searchParams.get("uploadId") ?? "";
  if (!/^\w+$/.test(dramaId) || !ID.test(uploadId)) return Response.json({ error: "Bad request" }, { status: 400 });
  const key = partKey(dramaId, uploadId);
  return Response.json({ size: exists(key) ? await fileSize(key) : 0 });
}
