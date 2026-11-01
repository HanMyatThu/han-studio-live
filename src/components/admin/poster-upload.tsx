"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";
import { Poster } from "../poster";

export function PosterUpload({ dramaId, title, accent, posterUrl }: { dramaId: string; title: string; accent: string; posterUrl: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button onClick={() => input.current?.click()} className="group relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/15">
      <Poster title={title} accent={accent} posterUrl={posterUrl} size="sm" className="h-full w-full" />
      <span className="absolute inset-0 grid place-items-center bg-black/60 opacity-0 transition group-hover:opacity-100">
        {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
      </span>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          await fetch(`/api/admin/poster/${dramaId}`, { method: "POST", headers: { "Content-Type": file.type }, body: file });
          setBusy(false);
          router.refresh();
        }}
      />
    </button>
  );
}
