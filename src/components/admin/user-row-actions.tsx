"use client";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Shield, ShieldOff, Ban, Undo2, Trash2 } from "lucide-react";
import { deleteUser, setUserBanned, setUserRole } from "@/app/actions/admin";

export function UserRowActions({ id, role, banned }: { id: string; role: string; banned: boolean }) {
  const t = useTranslations("admin");
  const [pending, start] = useTransition();
  const btn = "grid size-8 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white disabled:opacity-40";
  return (
    <div className="inline-flex items-center gap-1">
      <button disabled={pending} className={btn} title={role === "ADMIN" ? t("makeUser") : t("makeAdmin")} onClick={() => start(() => setUserRole(id, role === "ADMIN" ? "USER" : "ADMIN"))}>
        {role === "ADMIN" ? <ShieldOff className="size-4" /> : <Shield className="size-4" />}
      </button>
      <button disabled={pending} className={btn} title={banned ? t("unban") : t("ban")} onClick={() => start(() => setUserBanned(id, !banned))}>
        {banned ? <Undo2 className="size-4" /> : <Ban className="size-4" />}
      </button>
      <button
        disabled={pending}
        className="grid size-8 place-items-center rounded-lg text-rose-300/70 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-40"
        title={t("deleteUser")}
        onClick={() => { if (confirm(t("confirmDeleteUser"))) start(() => deleteUser(id)); }}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
