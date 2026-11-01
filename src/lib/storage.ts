import "server-only";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

/**
 * Storage for video files.
 * "local" keeps files in ./storage (good for development).
 * For production, swap in Bunny Stream / S3 by implementing the same functions.
 */
const ROOT = path.join(process.cwd(), "storage");

export function storagePath(key: string) {
  const full = path.join(ROOT, key);
  if (!full.startsWith(ROOT)) throw new Error("Invalid storage key");
  return full;
}

export async function ensureDir(key: string) {
  await fsp.mkdir(path.dirname(storagePath(key)), { recursive: true });
}

export async function saveStream(key: string, body: ReadableStream<Uint8Array>) {
  await ensureDir(key);
  await pipeline(Readable.fromWeb(body as import("node:stream/web").ReadableStream), fs.createWriteStream(storagePath(key)));
}

export async function fileSize(key: string) {
  return (await fsp.stat(storagePath(key))).size;
}

export function createReadStream(key: string, range?: { start: number; end: number }) {
  return fs.createReadStream(storagePath(key), range);
}

export async function removeFile(key: string) {
  await fsp.rm(storagePath(key), { force: true });
}

export function exists(key: string) {
  return fs.existsSync(storagePath(key));
}

/**
 * File → web ReadableStream that is safe when the browser aborts the request
 * (video seeking, skipping episodes). Readable.toWeb() throws
 * "Controller is already closed" in that case.
 */
export function createWebStream(key: string, range?: { start: number; end: number }): ReadableStream<Uint8Array> {
  const file = fs.createReadStream(storagePath(key), range);
  let closed = false;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      file.on("data", (chunk) => {
        if (closed) return;
        try {
          controller.enqueue(new Uint8Array(chunk as Buffer));
          if ((controller.desiredSize ?? 1) <= 0) file.pause();
        } catch {
          closed = true;
          file.destroy();
        }
      });
      file.on("end", () => {
        if (closed) return;
        closed = true;
        try { controller.close(); } catch {}
      });
      file.on("error", (err) => {
        if (closed) return;
        closed = true;
        try { controller.error(err); } catch {}
      });
    },
    pull() {
      if (!closed) file.resume();
    },
    cancel() {
      closed = true;
      file.destroy();
    },
  });
}
