/**
 * Demo data: plans, an admin + demo viewer, and a few dramas with
 * generated placeholder clips and mock Burmese subtitles.
 * Run: npm run db:seed
 */
import path from "node:path";
import fs from "node:fs";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { generateDemoClip, concatClips, extractFrame, makePreview } from "../src/lib/media";
import { mockTranscribe, mockTranslate } from "../src/lib/ai/mock-script";
import { toVtt } from "../src/lib/subtitles";

const db = new PrismaClient();
const STORAGE = path.join(process.cwd(), "storage");

const DRAMAS = [
  { title: "The Billionaire's Secret Bride", genre: "CEO", accent: "#ff3d81", hue: 330, eps: 10, featured: true, tags: "contract marriage, rich, romance",
    synopsis: "A struggling florist signs a one-year marriage contract with a cold billionaire, never guessing he is the boy she saved ten years ago." },
  { title: "Moonlight Over Bagan", genre: "Romance", accent: "#ffb547", hue: 30, eps: 8, featured: true, tags: "temple, destiny, first love",
    synopsis: "Two strangers meet at sunrise among the temples of Bagan. One is running from a wedding, the other is running from the past." },
  { title: "Return of the Heiress", genre: "Revenge", accent: "#a855f7", hue: 275, eps: 12, featured: true, tags: "betrayal, family, comeback",
    synopsis: "Thrown out by her family on her wedding day, she returns five years later as the CEO who now owns all of them." },
  { title: "Midnight Contract", genre: "Thriller", accent: "#22d3ee", hue: 190, eps: 6, featured: false, tags: "mystery, crime",
    synopsis: "A lawyer finds a contract signed with her own name, dated tomorrow. Someone knows what she will do next." },
  { title: "The Dragon King's Return", genre: "Fantasy", accent: "#f97316", hue: 15, eps: 9, featured: false, tags: "power, hidden identity",
    synopsis: "Mocked as a useless son-in-law for three years, he is secretly the heir of the most powerful clan in the East." },
  { title: "Mother's Last Wish", genre: "Family", accent: "#34d399", hue: 150, eps: 7, featured: false, tags: "tearjerker, siblings",
    synopsis: "Three estranged siblings must live together for 30 days to fulfil their mother's final wish." },
  { title: "My Boss Is My Ex", genre: "Comedy", accent: "#facc15", hue: 50, eps: 8, featured: false, tags: "office, exes, funny",
    synopsis: "On her first day at the dream job, she finds out the new CEO is the ex she dumped by text message." },
  { title: "Crown of Thorns", genre: "Revenge", accent: "#ef4444", hue: 0, eps: 10, featured: false, tags: "palace, power",
    synopsis: "A maid who was framed for the queen's murder returns to the palace under a new name to find the real killer." },
];

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function main() {
  console.log("Seeding plans and users…");
  const plans = [
    { code: "WEEK", name: "Weekly Pass", days: 7, priceMmk: 3000, highlight: false },
    { code: "MONTH", name: "Monthly Pass", days: 30, priceMmk: 9900, highlight: true },
    { code: "QUARTER", name: "3-Month Pass", days: 90, priceMmk: 24900, highlight: false },
  ];
  for (const p of plans) await db.plan.upsert({ where: { code: p.code }, update: p, create: p });

  const adminEmail = process.env.ADMIN_EMAIL || "admin@zat.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin1234";
  await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, name: "Admin", role: "ADMIN", passwordHash: await bcrypt.hash(adminPassword, 10) },
  });
  await db.user.upsert({
    where: { email: "viewer@zat.local" },
    update: {},
    create: { email: "viewer@zat.local", name: "Demo Viewer", passwordHash: await bcrypt.hash("viewer1234", 10) },
  });

  for (const [i, d] of DRAMAS.entries()) {
    const slug = slugify(d.title);
    if (await db.drama.findUnique({ where: { slug } })) continue;
    console.log(`Creating "${d.title}" (${d.eps} episodes)…`);
    const drama = await db.drama.create({
      data: {
        slug, title: d.title, synopsis: d.synopsis, genre: d.genre, tags: d.tags, accent: d.accent,
        featured: d.featured, published: true, freeEpisodes: 3, views: 12000 + ((i * 7919) % 90000),
      },
    });
    const dir = path.join(STORAGE, "dramas", drama.id);
    fs.mkdirSync(dir, { recursive: true });
    for (let n = 1; n <= d.eps; n++) {
      const seconds = 18 + ((n * 5) % 12);
      const key = `dramas/${drama.id}/ep-${n}.mp4`;
      await generateDemoClip(path.join(STORAGE, key), seconds, d.hue + n * 6);
      const en = mockTranscribe(seconds);
      const my = en.map((c) => ({ ...c, text: mockTranslate(c.text) }));
      const thumbKey = `thumbs/${drama.id}/ep-${n}.jpg`;
      fs.mkdirSync(path.join(STORAGE, "thumbs", drama.id), { recursive: true });
      await extractFrame(path.join(STORAGE, key), seconds / 3, path.join(STORAGE, thumbKey));
      await db.episode.create({
        data: { dramaId: drama.id, number: n, videoKey: key, thumbKey, durationSec: seconds, subtitleEn: toVtt(en), subtitleMy: toVtt(my), status: "READY", likesCount: (n * 37 + i * 11) % 400 },
      });
      if (n === 1) {
        const previewKey = `previews/${drama.id}.mp4`;
        fs.mkdirSync(path.join(STORAGE, "previews"), { recursive: true });
        await makePreview(path.join(STORAGE, key), 1, 6, path.join(STORAGE, previewKey));
        await db.drama.update({ where: { id: drama.id }, data: { previewKey } });
      }
    }
  }

  // A long multi-scene video you can upload in the admin dashboard to try auto-splitting.
  const demo = path.join(process.cwd(), "demo-long-video.mp4");
  if (!fs.existsSync(demo)) {
    console.log("Creating demo-long-video.mp4 for testing the auto-split…");
    const tmp = path.join(STORAGE, "tmp-demo");
    fs.mkdirSync(tmp, { recursive: true });
    const parts: string[] = [];
    for (let s = 0; s < 12; s++) {
      const f = path.join(tmp, `scene-${s}.mp4`);
      await generateDemoClip(f, 10 + (s % 3) * 4, (s * 47) % 360);
      parts.push(f);
    }
    await concatClips(parts, demo, path.join(tmp, "list.txt"));
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
