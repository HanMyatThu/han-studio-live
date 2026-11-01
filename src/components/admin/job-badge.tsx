import clsx from "clsx";

export function JobStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        status === "DONE" && "bg-emerald-400/15 text-emerald-300",
        status === "RUNNING" && "bg-cyan-400/15 text-cyan-300",
        status === "QUEUED" && "bg-white/10 text-white/60",
        status === "FAILED" && "bg-rose-500/15 text-rose-300",
      )}
    >
      {status}
    </span>
  );
}
