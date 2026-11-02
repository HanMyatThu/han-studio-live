"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Cpu, RotateCcw } from "lucide-react";
import { retryJob } from "@/app/actions/admin";
import { JobStatusBadge } from "./job-badge";

type Job = { id: string; kind: string; status: string; step: string; progress: number; error: string | null; targetCount: number; startNumber: number; createdAt: string };

export function JobsPanel({ dramaId }: { dramaId: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const seen = useRef<Map<string, string> | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let inFlight = false;
    let fast = false;

    const poll = async () => {
      if (inFlight || stopped) return;
      inFlight = true;
      clearTimeout(timer);
      try {
        const res = await fetch(`/api/admin/jobs?dramaId=${dramaId}`).catch(() => null);
        if (res?.ok) {
          const data: { jobs: Job[] } = await res.json();
          setJobs(data.jobs);
          const prev = seen.current;
          // Refresh the page when a job we saw (or a brand-new one) has finished, so new episodes appear.
          const finished = prev !== null && data.jobs.some((j) => {
            const before = prev.get(j.id);
            const doneNow = j.status === "DONE" || j.status === "FAILED";
            return doneNow && before !== j.status;
          });
          if (finished) router.refresh();
          seen.current = new Map(data.jobs.map((j) => [j.id, j.status]));
          fast = data.jobs.some((j) => j.status === "QUEUED" || j.status === "RUNNING");
        }
      } finally {
        inFlight = false;
        if (!stopped) timer = setTimeout(poll, fast ? 1500 : 6000);
      }
    };
    poll();
    const kick = () => { fast = true; poll(); };
    window.addEventListener("zat:job-started", kick);
    return () => { stopped = true; clearTimeout(timer); window.removeEventListener("zat:job-started", kick); };
  }, [dramaId, router]);

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 font-semibold"><Cpu className="size-4 text-cyan-300" />{t("processing")}</div>
      {jobs.length === 0 ? (
        <p className="mt-4 text-sm text-white/40">—</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {jobs.map((j) => (
            <li key={j.id} className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold">
                  {j.kind === "SPLIT" ? `Split → ${j.targetCount} eps` : `EP ${j.startNumber}`}
                </span>
                <JobStatusBadge status={j.status} />
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className={j.status === "FAILED" ? "h-full bg-rose-500" : "bg-gradient-brand h-full"}
                  initial={false}
                  animate={{ width: `${j.progress}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className={j.status === "FAILED" ? "min-w-0 flex-1 text-xs text-rose-300/80" : "min-w-0 flex-1 truncate text-xs text-white/45"}>{j.error ?? j.step}</div>
                {j.status === "FAILED" && <RetryButton jobId={j.id} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RetryButton({ jobId }: { jobId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return msg ? (
    <span className="text-xs text-rose-300">{msg}</span>
  ) : (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await retryJob(jobId);
          if ("error" in res && res.error) setMsg(res.error);
          else window.dispatchEvent(new Event("zat:job-started"));
        })
      }
      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold hover:bg-white/15 disabled:opacity-50"
    >
      <RotateCcw className="size-3.5" /> Retry
    </button>
  );
}
