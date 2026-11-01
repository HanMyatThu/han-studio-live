import { createWebStream, exists } from "@/lib/storage";

const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const file = `posters/${key.join("/")}`;
  if (key.some((k) => k.includes("..")) || !exists(file)) return new Response(null, { status: 404 });
  const ext = file.split(".").pop() ?? "";
  return new Response(createWebStream(file), {
    headers: { "Content-Type": MIME[ext] ?? "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
