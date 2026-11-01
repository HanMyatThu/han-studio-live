"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Cpu } from "lucide-react";
import { JobStatusBadge } from "./job-badge";

type Job = { id: string; kind: string; status: string; step: string; progress: number; error: string | null; targetCount: number; startNumber: number; createdAt: string };

export function JobsPanel({ dramaId }: { dramaId: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const active = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const poll = async () => {
      const res = await fetch(`/api/admin/jobs?dramaId=${dramaId}`).catch(() => null);
      if (res?.ok) {
        const data: { jobs: Job[] } = await res.json();
        setJobs(data.jobs);
        const running = data.jobs.some((j) => j.status === "QUEUED" || j.status === "RUNNING");
        if (active.current && !running) router.refresh(); // a job just finished: show new episodes
        active.current = running;
      }
      if (!stopped) timer = setTimeout(poll, active.current ? 1500 : 6000);
    };
    poll();
    const kick = () => { clearTimeout(timer); active.current = true; poll(); };
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
              <div className="mt-1.5 truncate text-xs text-white/45">{j.error ?? j.step}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
