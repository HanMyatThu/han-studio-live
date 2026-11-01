import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Sign up" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthForm mode="register" next={next} />;
}
