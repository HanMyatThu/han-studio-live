"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";

export type AuthState = { error?: "invalid" | "exists" | "weakPassword" | "banned" } | undefined;

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) return { error: "invalid" };
  if (user.banned) return { error: "banned" };
  await createSession(user);
  redirect(safeNext(form.get("next")));
}

const RegisterSchema = z.object({
  name: z.string().trim().min(1).max(60),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6),
});

export async function register(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = RegisterSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues.some((i) => i.path[0] === "password") ? "weakPassword" : "invalid" };
  const { name, email, password } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) return { error: "exists" };
  const user = await db.user.create({ data: { name, email, passwordHash: await hashPassword(password) } });
  await createSession(user);
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
