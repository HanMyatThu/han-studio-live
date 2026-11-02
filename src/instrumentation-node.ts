/** Server start (Node.js only): recover processing jobs interrupted by a restart. */
export async function recoverJobs() {
  const { db } = await import("@/lib/db");
  // Jobs that were running when the server stopped can't continue: mark them so the admin can retry.
  await db.processingJob
    .updateMany({
      where: { status: "RUNNING" },
      data: { status: "FAILED", error: "Stopped by a server restart. Click Retry to run it again." },
    })
    .catch(() => {});
  // Jobs that were waiting in line: start them again.
  const queued = await db.processingJob.findMany({ where: { status: "QUEUED" }, orderBy: { createdAt: "asc" }, select: { id: true } }).catch(() => []);
  if (queued.length) {
    const { enqueueJob } = await import("@/lib/pipeline");
    queued.forEach((j) => enqueueJob(j.id));
  }
}
