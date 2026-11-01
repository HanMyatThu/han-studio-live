import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const demo = process.env.NODE_ENV !== "production"
    ? { email: process.env.ADMIN_EMAIL || "admin@zat.local", password: process.env.ADMIN_PASSWORD || "admin1234" }
    : undefined;
  return <AuthForm mode="login" next={next} demo={demo} />;
}
