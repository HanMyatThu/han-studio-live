export const localized = (locale: string, en: string, my?: string | null) => (locale === "my" && my ? my : en);

export const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K` : String(n);

export const kyat = (n: number) => n.toLocaleString("en-US");

export const duration = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

/** Public URL for generated artwork stored under storage/ (posters, thumbs, previews). */
export const mediaUrl = (key: string | null | undefined) => (key ? `/api/media/${key}` : null);
