import clsx from "clsx";

type Props = {
  title: string;
  accent: string;
  posterUrl?: string | null;
  genre?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
};

/** Drama poster. Uses the uploaded image, or generates cinematic art from the title and accent colour. */
export function Poster({ title, accent, posterUrl, genre, className, size = "md" }: Props) {
  if (posterUrl) {
    // Posters taken automatically from the video have no title on them, so we add one.
    const auto = posterUrl.includes("/posters/auto-");
    return (
      <div className={clsx("relative overflow-hidden bg-ink-800", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={posterUrl} alt={title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        <div className={clsx("absolute inset-0 bg-gradient-to-t to-transparent", auto ? "from-black/90 via-black/20" : "from-black/70 via-transparent")} />
        {auto && (
          <div className="absolute inset-x-0 bottom-0 p-3">
            {genre && size !== "sm" && (
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>{genre}</div>
            )}
            <div className={clsx("font-display font-extrabold leading-[1.05] tracking-tight text-white drop-shadow-lg", size === "lg" ? "text-3xl" : size === "sm" ? "text-sm" : "text-lg")}>
              {title}
            </div>
          </div>
        )}
      </div>
    );
  }
  const seed = [...title].reduce((a, c) => a + c.charCodeAt(0), 0);
  const angle = seed % 360;
  const x = 20 + (seed % 60);
  return (
    <div
      className={clsx("grain relative overflow-hidden", className)}
      style={{
        background: `radial-gradient(120% 80% at ${x}% 10%, ${accent}cc 0%, transparent 55%),
          radial-gradient(90% 70% at ${100 - x}% 100%, ${accent}55 0%, transparent 60%),
          linear-gradient(${angle}deg, #120e1c, #07060b)`,
      }}
    >
      <div
        className="absolute -right-1/4 top-1/4 aspect-square w-[90%] rounded-full opacity-40 blur-2xl"
        style={{ background: `conic-gradient(from ${angle}deg, ${accent}, transparent 40%, ${accent}88, transparent)` }}
      />
      <svg className="absolute inset-0 h-full w-full opacity-[0.12]" viewBox="0 0 100 150" preserveAspectRatio="none">
        <path d={`M0 ${100 + (seed % 20)} Q 50 ${60 + (seed % 30)} 100 ${110 - (seed % 25)} L100 150 L0 150 Z`} fill="white" />
      </svg>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3 pt-16">
        {genre && size !== "sm" && (
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
            {genre}
          </div>
        )}
        <div
          className={clsx(
            "font-display font-extrabold leading-[1.05] tracking-tight text-white drop-shadow-lg",
            size === "lg" ? "text-3xl" : size === "sm" ? "text-sm" : "text-lg",
          )}
        >
          {title}
        </div>
      </div>
    </div>
  );
}
