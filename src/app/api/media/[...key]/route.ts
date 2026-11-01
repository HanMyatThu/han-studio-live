import { createWebStream, exists, fileSize } from "@/lib/storage";

const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", mp4: "video/mp4" };
const PUBLIC_FOLDERS = ["posters", "thumbs", "previews"];

/** Public artwork: posters, episode thumbnails and short preview clips. */
export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const file = key.join("/");
  if (!PUBLIC_FOLDERS.includes(key[0]) || key.some((k) => k.includes("..")) || !exists(file)) {
    return new Response(null, { status: 404 });
  }
  const ext = file.split(".").pop() ?? "";
  const size = await fileSize(file);
  const headers = { "Content-Type": MIME[ext] ?? "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable", "Accept-Ranges": "bytes" };
  const range = req.headers.get("range");
  const m = range ? /bytes=(\d*)-(\d*)/.exec(range) : null;
  if (m && m[1]) {
    const start = parseInt(m[1], 10);
    const end = Math.min(m[2] ? parseInt(m[2], 10) : size - 1, size - 1);
    if (start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    return new Response(createWebStream(file, { start, end }), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(createWebStream(file), { headers: { ...headers, "Content-Length": String(size) } });
}
