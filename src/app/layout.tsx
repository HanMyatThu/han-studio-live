import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Sora, Noto_Sans_Myanmar } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Pwa } from "@/components/pwa/pwa";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora", weight: ["400", "600", "700", "800"] });
const myanmar = Noto_Sans_Myanmar({ subsets: ["myanmar"], variable: "--font-myanmar", weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: { default: "Zat · Short dramas with Burmese subtitles", template: "%s · Zat" },
  description: "Bite-sized drama episodes with Burmese subtitles.",
  applicationName: "Zat",
  appleWebApp: { capable: true, title: "Zat", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#060509",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} className={`${jakarta.variable} ${sora.variable} ${myanmar.variable}`}>
      <body className="min-h-dvh">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <Pwa />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
