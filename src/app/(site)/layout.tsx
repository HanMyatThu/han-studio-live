import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BottomNav } from "@/components/bottom-nav";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <BottomNav />
    </>
  );
}
