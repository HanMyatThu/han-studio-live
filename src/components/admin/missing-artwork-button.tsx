"use client";
import { useState, useTransition } from "react";
import { ImagePlay, Loader2 } from "lucide-react";
import { generateMissingArtwork } from "@/app/actions/admin";

export function MissingArtworkButton() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => {
        const r = await generateMissingArtwork();
        setResult(`${r.episodes} thumbnails, ${r.dramas} dramas updated`);
      })}
      className="glass flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <ImagePlay className="size-4" />}
      {result ?? "Generate missing artwork"}
    </button>
  );
}
