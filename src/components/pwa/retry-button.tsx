"use client";

export function RetryButton({ label }: { label: string }) {
  return (
    <button onClick={() => location.reload()} className="mt-6 rounded-full bg-white px-6 py-2.5 font-bold text-ink-950">
      {label}
    </button>
  );
}
