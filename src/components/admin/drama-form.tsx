"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Check } from "lucide-react";
import type { DramaFormState } from "@/app/actions/admin";

type Drama = {
  title: string; titleMy: string | null; synopsis: string; synopsisMy: string | null; genre: string;
  tags: string; accent: string; freeEpisodes: number; featured: boolean;
};

const GENRES = ["Romance", "Revenge", "CEO", "Fantasy", "Thriller", "Family", "Comedy"];

export function DramaForm({ action, drama }: { action: (s: DramaFormState, f: FormData) => Promise<DramaFormState>; drama?: Drama }) {
  const t = useTranslations("admin");
  const [state, formAction, pending] = useActionState(action, undefined);
  const input = "w-full rounded-xl bg-white/5 px-3.5 py-2.5 outline-none ring-1 ring-white/10 transition focus:ring-2 focus:ring-rose-glow/60";
  const label = "mb-1.5 block text-xs font-semibold text-white/55";
  return (
    <form action={formAction} className="glass grid gap-4 rounded-2xl p-5 md:grid-cols-2">
      <div><label className={label}>{t("fields.title")}</label><input name="title" required defaultValue={drama?.title} className={input} /></div>
      <div><label className={label}>{t("fields.titleMy")}</label><input name="titleMy" lang="my" defaultValue={drama?.titleMy ?? ""} className={input} /></div>
      <div><label className={label}>{t("fields.synopsis")}</label><textarea name="synopsis" required rows={4} defaultValue={drama?.synopsis} className={input} /></div>
      <div><label className={label}>{t("fields.synopsisMy")}</label><textarea name="synopsisMy" lang="my" rows={4} defaultValue={drama?.synopsisMy ?? ""} className={input} /></div>
      <div>
        <label className={label}>{t("fields.genre")}</label>
        <select name="genre" defaultValue={drama?.genre ?? "Romance"} className={input}>
          {GENRES.map((g) => <option key={g} className="bg-ink-900">{g}</option>)}
        </select>
      </div>
      <div><label className={label}>{t("fields.tags")}</label><input name="tags" defaultValue={drama?.tags} className={input} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className={label}>{t("fields.freeEpisodes")}</label><input name="freeEpisodes" type="number" min={0} defaultValue={drama?.freeEpisodes ?? 3} className={input} /></div>
        <div><label className={label}>{t("fields.accent")}</label><input name="accent" type="color" defaultValue={drama?.accent ?? "#ff3d81"} className="h-[42px] w-full cursor-pointer rounded-xl bg-white/5 p-1 ring-1 ring-white/10" /></div>
      </div>
      <label className="flex items-center gap-3 self-end rounded-xl bg-white/5 px-3.5 py-2.5 ring-1 ring-white/10">
        <input type="checkbox" name="featured" defaultChecked={drama?.featured} className="size-4 accent-rose-500" />
        <span className="text-sm">{t("fields.featured")}</span>
      </label>
      <div className="flex items-center gap-3 md:col-span-2">
        <button disabled={pending} className="bg-gradient-brand flex items-center gap-2 rounded-xl px-6 py-2.5 font-bold disabled:opacity-60">
          {pending && <Loader2 className="size-4 animate-spin" />} {t("save")}
        </button>
        {state?.ok && <span className="flex items-center gap-1 text-sm text-emerald-300"><Check className="size-4" />{t("saved")}</span>}
        {state?.error && <span className="text-sm text-rose-300">{state.error}</span>}
      </div>
    </form>
  );
}
