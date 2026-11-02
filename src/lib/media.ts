import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "ffprobe-static";

function run(bin: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${bin} exited with ${code}: ${stderr.slice(-800)}`));
    });
  });
}

// FFMPEG_PATH / FFPROBE_PATH let the server use the system ffmpeg (needed on ARM servers,
// where ffprobe-static has no binary). Locally the bundled binaries are used.
const FFMPEG = () => {
  const bin = process.env.FFMPEG_PATH || (ffmpegPath as unknown as string | null);
  if (!bin) throw new Error("ffmpeg binary not found (ffmpeg-static)");
  return bin;
};
const FFPROBE = () => process.env.FFPROBE_PATH || ffprobe.path;

export async function probeDuration(file: string): Promise<number> {
  const { stdout } = await run(FFPROBE(), [
    "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file,
  ]);
  return parseFloat(stdout.trim()) || 0;
}

/** Timestamps (seconds) where the picture changes a lot, i.e. likely scene cuts. */
export async function detectScenes(file: string, threshold = 0.35): Promise<number[]> {
  const { stderr } = await run(FFMPEG(), [
    "-hide_banner", "-i", file,
    "-filter:v", `select='gt(scene,${threshold})',showinfo`,
    "-an", "-f", "null", "-",
  ]);
  const times: number[] = [];
  for (const m of stderr.matchAll(/pts_time:([\d.]+)/g)) times.push(parseFloat(m[1]));
  return times;
}

/** Small mono MP3, suitable for speech-to-text APIs (under 25 MB for ~1h). */
export async function extractAudio(file: string, out: string) {
  await run(FFMPEG(), ["-y", "-i", file, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", out]);
}

/** Frame-accurate cut, re-encoded for smooth web playback. */
export async function cutSegment(file: string, start: number, end: number, out: string) {
  await run(FFMPEG(), [
    "-y", "-ss", start.toFixed(3), "-to", end.toFixed(3), "-i", file,
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", out,
  ]);
}

/** Copy into web-friendly MP4 (used for single-episode uploads). */
export async function normalize(file: string, out: string) {
  await run(FFMPEG(), [
    "-y", "-i", file, "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", out,
  ]);
}

/** Colourful placeholder clip used by the demo seed (no real footage needed). */
export async function generateDemoClip(out: string, seconds: number, hue: number) {
  await run(FFMPEG(), [
    "-y",
    "-f", "lavfi", "-i", `gradients=s=360x640:d=${seconds}:speed=0.015:c0=0x${hsl(hue, 70, 28)}:c1=0x${hsl(hue + 50, 85, 50)}:x0=0:y0=0:x1=360:y1=640`,
    "-f", "lavfi", "-i", `sine=frequency=${180 + (hue % 200)}:duration=${seconds}`,
    "-vf", "drawbox=x=0:y=ih*0.78:w=iw:h=ih*0.22:color=black@0.35:t=fill",
    "-shortest", "-c:v", "libx264", "-preset", "veryfast", "-crf", "30", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "48k", "-af", "volume=0.03", "-movflags", "+faststart", out,
  ]);
}

/** Join clips into one file (used to build a long demo video with clear scene changes). */
export async function concatClips(files: string[], out: string, listFile: string) {
  const { writeFile } = await import("node:fs/promises");
  await writeFile(listFile, files.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n"));
  await run(FFMPEG(), ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", out]);
}

export function hsl(h: number, s: number, l: number) {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}

/** Single JPG frame, scaled to `width` (keeps aspect ratio). */
export async function extractFrame(file: string, atSec: number, out: string, width = 480) {
  await run(FFMPEG(), ["-y", "-ss", atSec.toFixed(2), "-i", file, "-frames:v", "1", "-vf", `scale=${width}:-2`, "-q:v", "3", out]);
}

/** 2:3 poster cropped from the centre of a frame. */
export async function extractPoster(file: string, atSec: number, out: string) {
  await run(FFMPEG(), [
    "-y", "-ss", atSec.toFixed(2), "-i", file, "-frames:v", "1",
    "-vf", "crop='min(iw,ih*2/3)':'min(ih,iw*3/2)',scale=600:900", "-q:v", "3", out,
  ]);
}

/** Short, muted, small preview clip for autoplay on the home page. */
export async function makePreview(file: string, start: number, seconds: number, out: string) {
  await run(FFMPEG(), [
    "-y", "-ss", start.toFixed(2), "-t", String(seconds), "-i", file, "-an",
    "-vf", "scale='if(gt(iw,ih),640,-2)':'if(gt(iw,ih),-2,640)'",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "30", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out,
  ]);
}
