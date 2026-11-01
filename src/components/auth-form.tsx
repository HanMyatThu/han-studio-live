"use client";
import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { login, register, type AuthState } from "@/app/actions/auth";

export function AuthForm({ mode, next, demo }: { mode: "login" | "register"; next?: string; demo?: { email: string; password: string } }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? login : register, undefined);
  const field = "w-full rounded-2xl bg-white/5 px-4 py-3.5 outline-none ring-1 ring-white/10 transition placeholder:text-white/30 focus:bg-white/[0.07] focus:ring-2 focus:ring-rose-glow/60";
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-[28px] bg-ink-900/60 p-8 shadow-2xl">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">{mode === "login" ? t("loginTitle") : t("registerTitle")}</h1>
      <form action={action} className="mt-6 grid gap-3">
        <input type="hidden" name="next" value={next ?? "/"} />
        {mode === "register" && <input name="name" required placeholder={t("name")} className={field} autoComplete="name" />}
        <input name="email" type="email" required placeholder={t("email")} className={field} autoComplete="email" />
        <input name="password" type="password" required placeholder={t("password")} className={field} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        {state?.error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{t(state.error)}</p>}
        <button disabled={pending} className="bg-gradient-brand mt-2 flex items-center justify-center gap-2 rounded-2xl py-3.5 font-bold shadow-[0_10px_40px_-12px_#ff3d81] disabled:opacity-70">
          {pending && <Loader2 className="size-4 animate-spin" />}
          {mode === "login" ? t("login") : t("register")}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-white/50">
        {mode === "login" ? t("noAccount") : t("haveAccount")}{" "}
        <Link href={`/${mode === "login" ? "register" : "login"}${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-white hover:underline">
          {mode === "login" ? t("register") : t("login")}
        </Link>
      </p>
      {demo && <p className="mt-4 rounded-xl bg-white/5 px-3 py-2 text-center font-mono text-[11px] text-white/40">{t("demo", demo)}</p>}
    </motion.div>
  );
}
