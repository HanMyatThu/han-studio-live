import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const dramaId = new URL(req.url).searchParams.get("dramaId") ?? undefined;
  const jobs = await db.processingJob.findMany({
    where: dramaId ? { dramaId } : {},
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, kind: true, status: true, step: true, progress: true, error: true, targetCount: true, startNumber: true, createdAt: true },
  });
  return Response.json({ jobs });
}
