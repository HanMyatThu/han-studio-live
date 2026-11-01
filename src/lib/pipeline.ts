import "server-only";
import path from "node:path";
import fsp from "node:fs/promises";
import { db } from "./db";
import { storagePath, ensureDir, removeFile } from "./storage";
import { probeDuration, detectScenes, extractAudio, cutSegment, normalize } from "./media";
import { transcribe } from "./ai/transcribe";
import { translateToBurmese } from "./ai/translate";
import { pickSplitPoints } from "./ai/split";
import { sliceCues, toVtt } from "./subtitles";
import { generateDramaArtwork, generateEpisodeThumb } from "./artwork";

/**
 * In-process job queue. Good enough for one server.
 * For production scale, move runJob() into a worker (BullMQ / a queue service).
 */
const g = globalThis as unknown as { zatQueue?: Promise<void> };

export function enqueueJob(jobId: string) {
  g.zatQueue = (g.zatQueue ?? Promise.resolve()).then(() => runJob(jobId)).catch(() => {});
}

async function update(jobId: string, step: string, progress: number, extra: Record<string, unknown> = {}) {
  const job = await db.processingJob.findUnique({ where: { id: jobId } });
  await db.processingJob.update({
    where: { id: jobId },
    data: { step, progress, log: `${job?.log ?? ""}[${new Date().toLocaleTimeString()}] ${step}\n`, ...extra },
  });
}

export async function runJob(jobId: string) {
  const job = await db.processingJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== "QUEUED") return;
  await db.processingJob.update({ where: { id: jobId }, data: { status: "RUNNING" } });

  const source = storagePath(job.sourceKey);
  const workDir = path.join(path.dirname(source), `work-${job.id}`);
  await fsp.mkdir(workDir, { recursive: true });

  try {
    await update(jobId, "Reading video", 5);
    const duration = await probeDuration(source);

    await update(jobId, "Extracting audio", 12);
    const audio = path.join(workDir, "audio.mp3");
    await extractAudio(source, audio);

    await update(jobId, "Transcribing English speech", 25);
    const cuesEn = await transcribe(audio, duration);

    await update(jobId, "Translating subtitles to Burmese", 45);
    const cuesMy = await translateToBurmese(cuesEn);

    let ranges: [number, number][] = [[0, duration]];
    if (job.kind === "SPLIT" && job.targetCount > 1) {
      await update(jobId, "Detecting scene changes", 55);
      const scenes = await detectScenes(source).catch(() => []);
      const cuts = pickSplitPoints(duration, job.targetCount, scenes, cuesEn);
      const bounds = [0, ...cuts, duration];
      ranges = bounds.slice(0, -1).map((s, i) => [s, bounds[i + 1]]);
      await update(jobId, `Cutting at ${cuts.map((c) => c.toFixed(1) + "s").join(", ")}`, 60);
    }

    for (let i = 0; i < ranges.length; i++) {
      const [from, to] = ranges[i];
      const number = job.startNumber + i;
      await update(jobId, `Encoding episode ${number} (${i + 1}/${ranges.length})`, 60 + Math.round((i / ranges.length) * 35));
      const key = `dramas/${job.dramaId}/ep-${number}-${Date.now()}.mp4`;
      await ensureDir(key);
      if (ranges.length === 1) await normalize(source, storagePath(key));
      else await cutSegment(source, from, to, storagePath(key));

      const data = {
        videoKey: key,
        durationSec: to - from,
        subtitleEn: toVtt(sliceCues(cuesEn, from, to)),
        subtitleMy: toVtt(sliceCues(cuesMy, from, to)),
        status: "REVIEW",
      };
      const existing = await db.episode.findUnique({ where: { dramaId_number: { dramaId: job.dramaId, number } } });
      let episodeId: string;
      if (existing) {
        await removeFile(existing.videoKey).catch(() => {});
        if (existing.thumbKey) await removeFile(existing.thumbKey).catch(() => {});
        episodeId = (await db.episode.update({ where: { id: existing.id }, data: { ...data, thumbKey: null } })).id;
      } else {
        episodeId = (await db.episode.create({ data: { ...data, dramaId: job.dramaId, number } })).id;
      }
      await generateEpisodeThumb(episodeId).catch(() => {});
    }

    await update(jobId, "Creating poster and preview clip", 97);
    await generateDramaArtwork(job.dramaId).catch(() => {});

    await update(jobId, `Done: ${ranges.length} episode(s) ready for review`, 100, { status: "DONE" });
    await removeFile(job.sourceKey).catch(() => {});
  } catch (err) {
    await update(jobId, "Failed", 100, { status: "FAILED", error: err instanceof Error ? err.message : String(err) });
  } finally {
    await fsp.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
