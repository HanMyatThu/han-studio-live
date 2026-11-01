import "server-only";
import type { Cue } from "../subtitles";
import { mockTranslate } from "./mock-script";

const BATCH = 60;

const PROMPT = `You translate English drama subtitles into natural, spoken Burmese (Myanmar Unicode, never Zawgyi).
Keep the emotion and tone of a TV drama. Keep each line short enough for a subtitle.
You receive a JSON array of strings. Reply with ONLY a JSON array of the same length, in the same order.`;

/** Translate subtitle text to Burmese, keeping timing untouched. */
export async function translateToBurmese(cues: Cue[]): Promise<Cue[]> {
  const provider = process.env.TRANSLATION_PROVIDER || "mock";
  const out: Cue[] = [];
  for (let i = 0; i < cues.length; i += BATCH) {
    const batch = cues.slice(i, i + BATCH);
    const texts = batch.map((c) => c.text);
    let translated: string[];
    if (provider === "openai") translated = await viaOpenAI(texts);
    else if (provider === "gemini") translated = await viaGemini(texts);
    else translated = texts.map(mockTranslate);
    batch.forEach((c, j) => out.push({ ...c, text: translated[j] ?? c.text }));
  }
  return out;
}

function parseArray(raw: string, expected: number): string[] {
  const match = raw.match(/\[[\s\S]*\]/);
  const arr = JSON.parse(match ? match[0] : raw) as string[];
  if (!Array.isArray(arr) || arr.length !== expected) throw new Error("Translator returned the wrong number of lines");
  return arr;
}

async function viaOpenAI(texts: string[]) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_TRANSLATE_MODEL || "gpt-4.1-mini",
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: JSON.stringify(texts) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI translation failed: ${res.status}`);
  const data = await res.json();
  return parseArray(data.choices[0].message.content, texts.length);
}

async function viaGemini(texts: string[]) {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: PROMPT }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify(texts) }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini translation failed: ${res.status}`);
  const data = await res.json();
  return parseArray(data.candidates[0].content.parts[0].text, texts.length);
}
