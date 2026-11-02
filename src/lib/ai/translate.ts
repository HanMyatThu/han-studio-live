import "server-only";
import type { Cue } from "../subtitles";
import { mockTranslate } from "./mock-script";

const BATCH = 25;
const ATTEMPTS = 3;

const PROMPT = `You translate English drama subtitles into natural, spoken Burmese (Myanmar Unicode, never Zawgyi).
Keep the emotion and tone of a TV drama. Keep each line short enough for a subtitle.
You receive a JSON object whose keys are line numbers and values are English lines.
Reply with ONLY a JSON object with exactly the same keys, each value being the Burmese translation of that line.
Never merge, split, skip or add lines.`;

type Lines = Record<string, string>;

/** Translate subtitle text to Burmese, keeping timing untouched. */
export async function translateToBurmese(cues: Cue[]): Promise<Cue[]> {
  const provider = process.env.TRANSLATION_PROVIDER || "mock";
  if (provider !== "openai" && provider !== "gemini") return cues.map((c) => ({ ...c, text: mockTranslate(c.text) }));
  const call = provider === "openai" ? viaOpenAI : viaGemini;

  const result: string[] = cues.map((c) => c.text);
  let failedLines = 0;
  for (let i = 0; i < cues.length; i += BATCH) {
    // Numbered lines, so a reply can be matched line by line even if the model drops one.
    let pending: Lines = Object.fromEntries(cues.slice(i, i + BATCH).map((c, j) => [String(i + j + 1), c.text]));
    for (let attempt = 1; attempt <= ATTEMPTS && Object.keys(pending).length; attempt++) {
      try {
        const reply = await call(pending);
        for (const key of Object.keys(pending)) {
          const text = reply[key];
          if (typeof text === "string" && text.trim()) {
            result[Number(key) - 1] = text.trim();
            delete pending[key];
          }
        }
      } catch (err) {
        if (attempt === ATTEMPTS) console.error("Translation batch failed:", err);
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
      pending = { ...pending };
    }
    failedLines += Object.keys(pending).length; // these stay in English
  }
  if (failedLines === cues.length && cues.length > 0) throw new Error("Translation failed for every line. Check the API key and TRANSLATION_PROVIDER.");
  if (failedLines) console.warn(`${failedLines} subtitle line(s) were left in English; fix them in the subtitle editor.`);
  return cues.map((c, i) => ({ ...c, text: result[i] }));
}

function parseObject(raw: string): Lines {
  const match = raw.match(/\{[\s\S]*\}/);
  const obj = JSON.parse(match ? match[0] : raw);
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw new Error("Translator reply was not a JSON object");
  return obj as Lines;
}

async function viaOpenAI(lines: Lines): Promise<Lines> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_TRANSLATE_MODEL || "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: JSON.stringify(lines) },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`OpenAI translation failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return parseObject(data.choices[0].message.content);
}

async function viaGemini(lines: Lines): Promise<Lines> {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: PROMPT }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify(lines) }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(120_000),
    },
  );
  if (!res.ok) throw new Error(`Gemini translation failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return parseObject(data.candidates[0].content.parts[0].text);
}
