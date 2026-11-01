import { getTranslations } from "next-intl/server";
import { WifiOff } from "lucide-react";
import { Logo } from "@/components/logo";
import { RetryButton } from "@/components/pwa/retry-button";

export const metadata = { title: "Offline" };

export default async function OfflinePage() {
  const t = await getTranslations("pwa");
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <div className="mb-10 flex justify-center"><Logo /></div>
        <WifiOff className="mx-auto size-12 text-white/40" />
        <h1 className="font-display mt-4 text-2xl font-bold">{t("offlineTitle")}</h1>
        <p className="mt-2 text-white/55">{t("offlineBody")}</p>
        <RetryButton label={t("retry")} />
      </div>
    </div>
  );
}
