import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { saveStream } from "@/lib/storage";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(req: Request, { params }: { params: Promise<{ dramaId: string }> }) {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { dramaId } = await params;
  const ext = TYPES[req.headers.get("content-type") ?? ""];
  if (!ext || !req.body) return Response.json({ error: "Upload a JPG, PNG or WebP image" }, { status: 400 });
  const key = `posters/${dramaId}-${Date.now()}.${ext}`;
  await saveStream(key, req.body);
  await db.drama.update({ where: { id: dramaId }, data: { posterUrl: `/api/${key}` } });
  return Response.json({ posterUrl: `/api/${key}` });
}
