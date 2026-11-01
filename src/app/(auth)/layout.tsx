import Link from "next/link";
import { Logo } from "@/components/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-16">
      <div className="animate-aurora absolute -left-40 -top-40 size-[600px] rounded-full bg-rose-glow/30 blur-3xl" />
      <div className="animate-aurora absolute -bottom-40 -right-40 size-[600px] rounded-full bg-violet-glow/30 blur-3xl [animation-delay:-6s]" />
      <div className="absolute left-4 right-4 top-4 flex items-center justify-between md:left-8 md:right-8">
        <Link href="/"><Logo /></Link>
        <LocaleSwitcher />
      </div>
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
