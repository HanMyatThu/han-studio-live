export type Cue = { start: number; end: number; text: string };

function ts(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`;
}

export function toVtt(cues: Cue[]) {
  return (
    "WEBVTT\n\n" +
    cues.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}`).join("\n\n") +
    "\n"
  );
}

function parseTs(t: string) {
  const parts = t.trim().replace(",", ".").split(":").map(Number);
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

export function parseVtt(vtt: string): Cue[] {
  const cues: Cue[] = [];
  for (const block of vtt.replace(/\r/g, "").split(/\n\n+/)) {
    const lines = block.split("\n");
    const idx = lines.findIndex((l) => l.includes("-->"));
    if (idx === -1) continue;
    const [a, b] = lines[idx].split("-->");
    cues.push({ start: parseTs(a), end: parseTs(b.split(" ").filter(Boolean)[0]), text: lines.slice(idx + 1).join("\n") });
  }
  return cues;
}

/** Cues that fall inside [from, to), shifted so the episode starts at 0. */
export function sliceCues(cues: Cue[], from: number, to: number): Cue[] {
  return cues
    .filter((c) => c.end > from && c.start < to)
    .map((c) => ({ start: Math.max(0, c.start - from), end: Math.min(to, c.end) - from, text: c.text }));
}
