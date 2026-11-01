"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Check, Loader2, PartyPopper, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import { buyPass } from "@/app/actions/viewer";
import { kyat } from "@/lib/format";

type Plan = { code: string; name: string; days: number; priceMmk: number; highlight: boolean };
type Method = { code: string; name: string; color: string };

export function Checkout({ plans, methods, loggedIn }: { plans: Plan[]; methods: Method[]; loggedIn: boolean }) {
  const t = useTranslations("subscribe");
  const [plan, setPlan] = useState(plans.find((p) => p.highlight)?.code ?? plans[0]?.code);
  const [method, setMethod] = useState(methods[0].code);
  const [pending, start] = useTransition();
  const [done, setDone] = useState<{ endsAt?: string; reference: string } | null>(null);
  const selected = plans.find((p) => p.code === plan);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 md:px-8">
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const perDay = Math.round(p.priceMmk / p.days);
          const active = plan === p.code;
          return (
            <button
              key={p.code}
              onClick={() => setPlan(p.code)}
              className={clsx(
                "relative overflow-hidden rounded-3xl p-6 text-left transition duration-300",
                active ? "bg-white/[0.08] ring-2 ring-rose-glow shadow-[0_20px_60px_-20px_#ff3d81]" : "glass hover:bg-white/[0.06]",
              )}
            >
              {p.highlight && (
                <span className="bg-gradient-brand absolute right-4 top-4 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">{t("popular")}</span>
              )}
              <div className="text-sm font-semibold text-white/60">{p.name}</div>
              <div className="font-display mt-3 text-4xl font-extrabold">
                {kyat(p.priceMmk)} <span className="text-base font-semibold text-white/50">Ks</span>
              </div>
              <div className="mt-1 text-sm text-white/50">{t("perDays", { days: p.days })} · {kyat(perDay)} Ks/day</div>
              <div className={clsx("mt-5 grid size-6 place-items-center rounded-full ring-2 transition", active ? "bg-rose-glow ring-rose-glow" : "ring-white/20")}>
                {active && <Check className="size-4" />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="glass mx-auto mt-6 max-w-2xl rounded-3xl p-6">
        <div className="text-sm font-semibold text-white/60">{t("payWith")}</div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {methods.map((m) => (
            <button
              key={m.code}
              onClick={() => setMethod(m.code)}
              className={clsx("flex flex-col items-center gap-2 rounded-2xl p-3 text-xs font-semibold ring-1 transition", method === m.code ? "bg-white/10 ring-white/50" : "ring-white/10 hover:bg-white/5")}
            >
              <span className="grid size-10 place-items-center rounded-xl font-display text-sm font-extrabold text-white" style={{ background: m.color, color: m.code === "WAVEPAY" ? "#111" : "#fff" }}>
                {m.name.slice(0, 1)}
              </span>
              {m.name}
            </button>
          ))}
        </div>
        <ul className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
          {[t("perks1"), t("perks2"), t("perks3"), t("perks4")].map((p: string) => (
            <li key={p} className="flex items-center gap-2 text-white/75"><Check className="size-4 text-emerald-300" />{p}</li>
          ))}
        </ul>
        {loggedIn ? (
          <button
            disabled={pending || !selected}
            onClick={() =>
              start(async () => {
                const res = await buyPass(plan!, method);
                if ("reference" in res && res.reference) setDone({ endsAt: res.endsAt, reference: res.reference });
              })
            }
            className="bg-gradient-brand relative mt-6 flex w-full items-center justify-center gap-2 overflow-hidden rounded-full py-4 text-lg font-bold shadow-[0_10px_40px_-10px_#ff3d81] disabled:opacity-70"
          >
            {pending ? <><Loader2 className="size-5 animate-spin" /> {t("processing")}</> : t("pay", { price: kyat(selected?.priceMmk ?? 0) })}
          </button>
        ) : (
          <Link href="/login?next=/subscribe" className="mt-6 flex w-full items-center justify-center rounded-full bg-white py-4 text-lg font-bold text-ink-950">
            {t("loginFirst")}
          </Link>
        )}
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-white/40"><ShieldCheck className="size-3.5" /> {t("mockNotice")}</p>
      </div>

      <AnimatePresence>
        {done && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-md">
            <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", damping: 18 }} className="glass w-full max-w-sm rounded-3xl bg-ink-900/80 p-8 text-center">
              <motion.div initial={{ rotate: -30, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 0.15, type: "spring" }} className="bg-gradient-brand mx-auto grid size-20 place-items-center rounded-full shadow-[0_10px_50px_-10px_#ff3d81]">
                <PartyPopper className="size-9" />
              </motion.div>
              <h2 className="font-display mt-5 text-3xl font-extrabold">{t("success")}</h2>
              <p className="mt-2 text-white/60">{t("successBody", { date: done.endsAt ? new Date(done.endsAt).toLocaleDateString() : "" })}</p>
              <p className="mt-1 font-mono text-xs text-white/35">{done.reference}</p>
              <Link href="/" className="mt-6 block rounded-full bg-white py-3 font-bold text-ink-950">{t("startWatching")}</Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
