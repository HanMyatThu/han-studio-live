import type { Cue } from "../subtitles";

/**
 * Canned dialogue used by the mock transcriber and translator, so the whole
 * pipeline works offline without API keys.
 */
export const MOCK_LINES: { en: string; my: string }[] = [
  { en: "You came back. After all these years.", my: "မင်း ပြန်လာခဲ့တယ်။ ဒီလောက်နှစ်တွေကြာပြီးမှ။" },
  { en: "I had no choice. They took everything from me.", my: "ငါ့မှာ ရွေးစရာမရှိခဲ့ဘူး။ သူတို့ ငါ့ဆီက အားလုံးကို ယူသွားတယ်။" },
  { en: "Do you know who I am now?", my: "အခု ငါ ဘယ်သူလဲဆိုတာ မင်းသိလား။" },
  { en: "Everyone in this city knows your name.", my: "ဒီမြို့က လူတိုင်း မင်းနာမည်ကို သိကြတယ်။" },
  { en: "Then you know I don't forgive easily.", my: "ဒါဆို ငါ လွယ်လွယ်နဲ့ ခွင့်မလွှတ်တတ်ဘူးဆိုတာ မင်းသိမှာပေါ့။" },
  { en: "I'm not asking for forgiveness. I'm asking for the truth.", my: "ငါ ခွင့်လွှတ်ဖို့ မတောင်းဆိုဘူး။ အမှန်တရားကို တောင်းဆိုနေတာ။" },
  { en: "The truth will destroy your family.", my: "အမှန်တရားက မင်းမိသားစုကို ဖျက်ဆီးလိမ့်မယ်။" },
  { en: "My family destroyed itself long ago.", my: "ငါ့မိသားစုက ဟိုးအရင်ကတည်းက သူ့ဘာသာ ပျက်စီးခဲ့ပြီ။" },
  { en: "Wait. Who sent you here?", my: "နေဦး။ ဘယ်သူက မင်းကို ဒီကိုလွှတ်လိုက်တာလဲ။" },
  { en: "Someone who wants you to remember that night.", my: "အဲဒီညကို မင်းပြန်သတိရစေချင်တဲ့ တစ်ယောက်ပေါ့။" },
  { en: "Don't touch her. She has nothing to do with this.", my: "သူမကို မထိနဲ့။ သူမနဲ့ ဒီကိစ္စ ဘာမှမဆိုင်ဘူး။" },
  { en: "She has everything to do with this.", my: "သူမနဲ့ ဒီကိစ္စ အကုန်ဆိုင်တယ်။" },
  { en: "Sign the contract, and I'll let you go.", my: "စာချုပ်ကို လက်မှတ်ထိုး၊ ပြီးရင် မင်းကို လွှတ်ပေးမယ်။" },
  { en: "I would rather lose everything.", my: "ငါ အကုန်လုံး ဆုံးရှုံးရတာက ပိုကောင်းသေးတယ်။" },
  { en: "Then you will.", my: "ဒါဆို ဆုံးရှုံးရလိမ့်မယ်။" },
  { en: "Tomorrow, the whole world will know.", my: "မနက်ဖြန်ဆိုရင် တစ်ကမ္ဘာလုံး သိသွားလိမ့်မယ်။" },
];

export function mockTranslate(text: string): string {
  return MOCK_LINES.find((l) => l.en === text)?.my ?? `【MY】${text}`;
}

/** Fake timed English dialogue covering the whole video. */
export function mockTranscribe(durationSec: number): Cue[] {
  const cues: Cue[] = [];
  let t = 0.8;
  let i = 0;
  while (t < durationSec - 1) {
    const len = 2.2 + ((i * 7) % 5) * 0.4;
    const end = Math.min(t + len, durationSec);
    cues.push({ start: t, end, text: MOCK_LINES[i % MOCK_LINES.length].en });
    t = end + 0.6 + ((i * 3) % 4) * 0.35; // natural pauses between lines
    i++;
  }
  return cues;
}
