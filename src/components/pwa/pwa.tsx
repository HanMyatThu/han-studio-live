"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, X } from "lucide-react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "zat_install_dismissed";
const VISITS_KEY = "zat_visits";

function store(key: string, value?: string) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch {}
  return null;
}

/** Registers the service worker and shows a friendly "Install app" card. */
export function Pwa() {
  const t = useTranslations("pwa");
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    if (standalone) return;
    const dismissed = Number(store(DISMISS_KEY) ?? 0);
    if (Date.now() - dismissed < 7 * 86_400_000) return; // ask again after a week
    const visits = Number(store(VISITS_KEY) ?? 0) + 1;
    store(VISITS_KEY, String(visits));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
      if (visits >= 2) setTimeout(() => setShow(true), 4000);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    if (isIos && visits >= 2) {
      setIos(true);
      setTimeout(() => setShow(true), 4000);
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    setShow(false);
    store(DISMISS_KEY, String(Date.now()));
  };

  return (
    <AnimatePresence>
      {show && (event || ios) && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 260 }}
          className="glass fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink-900/85 p-3 shadow-2xl md:bottom-6"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="size-12 rounded-xl" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">{t("installTitle")}</div>
            <div className="text-xs text-white/55">{ios ? t("iosHint") : t("installBody")}</div>
          </div>
          {!ios && event && (
            <button
              onClick={async () => {
                await event.prompt();
                await event.userChoice.catch(() => null);
                setEvent(null);
                setShow(false);
              }}
              className="bg-gradient-brand flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold"
            >
              <Download className="size-4" /> {t("install")}
            </button>
          )}
          {ios && <Share className="size-5 text-white/60" />}
          <button onClick={dismiss} className="grid size-8 place-items-center rounded-full text-white/50 hover:bg-white/10" aria-label={t("later")}>
            <X className="size-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
