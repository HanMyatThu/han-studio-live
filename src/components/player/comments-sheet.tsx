"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Send, Trash2, X, Loader2 } from "lucide-react";
import { addComment, deleteComment, listComments, type CommentView } from "@/app/actions/social";

function ago(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}

export function CommentsSheet(props: {
  open: boolean;
  onClose: () => void;
  episodeId: string;
  loggedIn: boolean;
  onCountChange: (delta: number) => void;
}) {
  const t = useTranslations("player");
  const [comments, setComments] = useState<CommentView[] | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!props.open) return;
    setComments(null);
    listComments(props.episodeId).then(setComments);
  }, [props.open, props.episodeId]);

  const submit = () =>
    start(async () => {
      setError(null);
      const res = await addComment(props.episodeId, text);
      if ("comment" in res && res.comment) {
        setComments((c) => [res.comment!, ...(c ?? [])]);
        setText("");
        props.onCountChange(1);
      } else if (res.error === "slow") setError(t("commentSlow"));
      else if (res.error === "banned") setError(t("commentBanned"));
    });

  return (
    <AnimatePresence>
      {props.open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={props.onClose} className="absolute inset-0 z-30 bg-black/50" />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 z-40 flex max-h-[70%] flex-col rounded-t-3xl bg-ink-900/95 backdrop-blur-xl"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 pb-3">
              <h3 className="font-display text-lg font-bold">{t("comments")}</h3>
              <button onClick={props.onClose} className="grid size-8 place-items-center rounded-full bg-white/10" aria-label="Close"><X className="size-4" /></button>
            </div>
            <div className="min-h-40 flex-1 overflow-y-auto px-5">
              {comments === null ? (
                <div className="grid h-32 place-items-center"><Loader2 className="size-5 animate-spin text-white/40" /></div>
              ) : comments.length === 0 ? (
                <p className="py-10 text-center text-sm text-white/45">{t("noComments")}</p>
              ) : (
                <ul className="space-y-4 pb-4">
                  {comments.map((c) => (
                    <li key={c.id} className="flex gap-3">
                      <span className="bg-gradient-brand grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold">{c.user.name.slice(0, 1).toUpperCase()}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs text-white/45">
                          <span className="font-semibold text-white/75">{c.user.name}</span> {ago(c.createdAt)}
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed">{c.body}</p>
                      </div>
                      {c.mine && (
                        <button
                          onClick={async () => {
                            await deleteComment(c.id);
                            setComments((cs) => cs?.filter((x) => x.id !== c.id) ?? null);
                            props.onCountChange(-1);
                          }}
                          className="self-start p-1 text-white/30 hover:text-rose-300"
                          aria-label={t("delete")}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-white/5 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {props.loggedIn ? (
                <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) submit(); }} className="flex items-center gap-2">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={500}
                    placeholder={t("addComment")}
                    className="flex-1 rounded-full bg-white/10 px-4 py-2.5 text-sm outline-none ring-1 ring-white/10 focus:ring-rose-glow/60"
                  />
                  <button disabled={pending || !text.trim()} className="bg-gradient-brand grid size-10 place-items-center rounded-full disabled:opacity-40" aria-label={t("send")}>
                    {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </button>
                </form>
              ) : (
                <Link href={`/login?next=${encodeURIComponent(typeof window !== "undefined" ? location.pathname : "/")}`} className="block rounded-full bg-white py-2.5 text-center text-sm font-bold text-ink-950">
                  {t("loginToComment")}
                </Link>
              )}
              {error && <p className="mt-2 text-center text-xs text-rose-300">{error}</p>}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
