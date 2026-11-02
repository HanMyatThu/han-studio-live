import "server-only";
import fs from "node:fs";
import { createHash } from "node:crypto";

/**
 * Bunny Stream (https://bunny.net/stream) — video storage, encoding to HLS and CDN delivery.
 *
 * .env:
 *   STORAGE_DRIVER="bunny"
 *   BUNNY_STREAM_LIBRARY_ID   Stream → your library → API → Video Library ID
 *   BUNNY_STREAM_API_KEY      Stream → your library → API → API Key
 *   BUNNY_STREAM_CDN_URL      Stream → your library → API → CDN Hostname, as https://vz-xxxx.b-cdn.net
 *   BUNNY_TOKEN_KEY           (optional) Pull zone → Security → Token Authentication key.
 *                             When set, playback links are signed and expire.
 */

const API = "https://video.bunnycdn.com/library";
const real = (v?: string) => !!v && !v.startsWith("mock");

export function bunnyEnabled() {
  return process.env.STORAGE_DRIVER === "bunny" && real(process.env.BUNNY_STREAM_API_KEY) && real(process.env.BUNNY_STREAM_LIBRARY_ID);
}

function cfg() {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID!;
  const apiKey = process.env.BUNNY_STREAM_API_KEY!;
  return { libraryId, headers: { AccessKey: apiKey, accept: "application/json" } };
}

/** Status codes from Bunny: 0 created, 1 uploaded, 2 processing, 3 transcoding, 4 finished, 5 error, 6 upload failed. */
export type BunnyVideo = { guid: string; status: number; length: number; width: number; height: number; encodeProgress: number };

export async function createVideo(title: string): Promise<string> {
  const { libraryId, headers } = cfg();
  const res = await fetch(`${API}/${libraryId}/videos`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Bunny create failed: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { guid: string }).guid;
}

export async function uploadFile(guid: string, file: string) {
  const { libraryId, headers } = cfg();
  const size = fs.statSync(file).size;
  const body = fs.createReadStream(file) as unknown as BodyInit;
  const res = await fetch(`${API}/${libraryId}/videos/${guid}`, {
    method: "PUT",
    headers: { ...headers, "content-type": "application/octet-stream", "content-length": String(size) },
    body,
    // Node needs this to stream a request body.
    duplex: "half",
  } as RequestInit);
  if (!res.ok) throw new Error(`Bunny upload failed: ${res.status} ${await res.text()}`);
}

export async function getVideo(guid: string): Promise<BunnyVideo> {
  const { libraryId, headers } = cfg();
  const res = await fetch(`${API}/${libraryId}/videos/${guid}`, { headers });
  if (!res.ok) throw new Error(`Bunny status failed: ${res.status}`);
  return res.json();
}

export async function deleteVideo(guid: string) {
  const { libraryId, headers } = cfg();
  await fetch(`${API}/${libraryId}/videos/${guid}`, { method: "DELETE", headers }).catch(() => {});
}

/** Upload a local file and wait until Bunny has finished encoding it. */
export async function uploadAndWait(title: string, file: string, onProgress?: (pct: number) => void, timeoutMs = 45 * 60_000) {
  const guid = await createVideo(title);
  await uploadFile(guid, file);
  const started = Date.now();
  for (;;) {
    const v = await getVideo(guid);
    if (v.status === 4) return guid;
    if (v.status === 5 || v.status === 6) throw new Error(`Bunny could not encode "${title}" (status ${v.status})`);
    onProgress?.(v.encodeProgress ?? 0);
    if (Date.now() - started > timeoutMs) throw new Error("Timed out waiting for Bunny to encode");
    await new Promise((r) => setTimeout(r, 5000));
  }
}

/**
 * HLS playlist URL. When BUNNY_TOKEN_KEY is set the link is signed for the
 * whole video folder (playlist + segments) and expires after `ttlSec`.
 */
export function playbackUrl(guid: string, ttlSec = 6 * 3600) {
  const base = (process.env.BUNNY_STREAM_CDN_URL || "").replace(/\/$/, "");
  const path = `/${guid}/playlist.m3u8`;
  const key = process.env.BUNNY_TOKEN_KEY;
  if (!real(key)) return `${base}${path}`;
  const expires = Math.floor(Date.now() / 1000) + ttlSec;
  const tokenPath = `/${guid}/`;
  const hashable = `${key}${tokenPath}${expires}token_path=${tokenPath}`;
  const token = createHash("sha256").update(hashable).digest("base64").replace(/\n/g, "").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return `${base}${path}?token=${token}&token_path=${encodeURIComponent(tokenPath)}&expires=${expires}`;
}
