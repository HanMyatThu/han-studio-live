import type { Cue } from "../subtitles";

/**
 * Choose where to cut a long video into `count` episodes.
 * Starts from evenly spaced targets, then snaps each cut to the best nearby
 * point: a scene change that is not in the middle of a spoken line, otherwise
 * the closest pause between lines.
 */
export function pickSplitPoints(duration: number, count: number, scenes: number[], cues: Cue[]): number[] {
  if (count <= 1) return [];
  const ideal = duration / count;
  const window = ideal * 0.25;
  const minGap = ideal * 0.5;

  const inSpeech = (t: number) => cues.some((c) => t > c.start + 0.05 && t < c.end - 0.05);
  const pauses = [0, ...cues.map((c, i) => (cues[i + 1] ? (c.end + cues[i + 1].start) / 2 : c.end))];

  const points: number[] = [];
  for (let i = 1; i < count; i++) {
    const target = ideal * i;
    const prev = points[points.length - 1] ?? 0;
    const near = (t: number) => Math.abs(t - target) <= window && t - prev >= minGap && duration - t >= minGap;

    const sceneCandidates = scenes.filter((t) => near(t) && !inSpeech(t));
    const pauseCandidates = pauses.filter(near);
    const pool = sceneCandidates.length ? sceneCandidates : pauseCandidates.length ? pauseCandidates : [target];
    const best = pool.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
    points.push(Math.round(best * 1000) / 1000);
  }
  return points;
}
