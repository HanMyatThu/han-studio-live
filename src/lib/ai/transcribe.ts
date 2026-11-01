import "server-only";
import fs from "node:fs";
import type { Cue } from "../subtitles";
import { mockTranscribe } from "./mock-script";

const hasKey = (k?: string) => !!k && k !== "mock";

/** English speech-to-text with timestamps. Uses OpenAI Whisper when a key is set. */
export async function transcribe(audioFile: string, durationSec: number): Promise<Cue[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!hasKey(key)) return mockTranscribe(durationSec);

  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(audioFile)]), "audio.mp3");
  form.append("model", "whisper-1");
  form.append("language", "en");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Transcription failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { segments: { start: number; end: number; text: string }[] };
  return data.segments.map((s) => ({ start: s.start, end: s.end, text: s.text.trim() }));
}
