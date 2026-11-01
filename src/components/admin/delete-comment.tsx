"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteComment } from "@/app/actions/social";

export function AdminDeleteComment({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => { await deleteComment(id); router.refresh(); })}
      className="grid size-8 shrink-0 place-items-center rounded-lg text-rose-300/70 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-40"
      aria-label="Delete"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
