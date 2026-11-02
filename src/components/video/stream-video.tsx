"use client";
import { useRef } from "react";
import { useStream, useQuality, type PlaybackSource } from "./use-stream";

/** <video> that plays either MP4 or HLS (Bunny Stream). Used in admin previews. */
export function StreamVideo({ source, ...props }: { source: PlaybackSource } & Omit<React.VideoHTMLAttributes<HTMLVideoElement>, "src">) {
  const ref = useRef<HTMLVideoElement>(null);
  const [quality] = useQuality();
  useStream(ref, source, { quality });
  return <video ref={ref} {...props} />;
}
