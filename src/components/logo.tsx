export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <span className="bg-gradient-brand relative grid size-8 place-items-center rounded-xl shadow-[0_6px_24px_-6px_#ff3d81]">
        <svg viewBox="0 0 24 24" className="size-4 fill-white"><path d="M8 5.5v13l10-6.5z" /></svg>
      </span>
      <span className="font-display text-xl font-extrabold tracking-tight">
        Zat Lan<span className="text-gradient">.</span>
      </span>
    </span>
  );
}
