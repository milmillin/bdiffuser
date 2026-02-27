import { useCallback, useEffect, useMemo, useState } from "react";
import { isStandaloneDisplayMode } from "./useStandaloneMode.js";

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{
      outcome: "accepted" | "dismissed";
      platform: string;
    }>;
  }
}

type InstallResult = "accepted" | "dismissed" | "unavailable";

function shouldShowIosInstallHint(
  isInstalled: boolean,
  canInstall: boolean,
): boolean {
  if (typeof navigator === "undefined") return false;
  if (isInstalled || canInstall) return false;

  const userAgent = navigator.userAgent.toLowerCase();
  const isIos = /(iphone|ipad|ipod)/i.test(userAgent);
  const isSafari = /safari/i.test(userAgent) && !/(crios|fxios|edgios)/i.test(userAgent);
  return isIos && isSafari;
}

export function usePwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => isStandaloneDisplayMode());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncInstalledState = () => {
      setIsInstalled(isStandaloneDisplayMode());
    };
    syncInstalledState();

    const displayModeMediaQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(display-mode: standalone)")
        : null;
    const displayModeMediaQueryCompat = displayModeMediaQuery as (MediaQueryList & {
      addEventListener?: (
        type: "change",
        listener: (event: MediaQueryListEvent) => void,
      ) => void;
      removeEventListener?: (
        type: "change",
        listener: (event: MediaQueryListEvent) => void,
      ) => void;
      addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
      removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
    }) | null;
    const onDisplayModeChange = () => syncInstalledState();

    if (
      displayModeMediaQueryCompat
      && typeof displayModeMediaQueryCompat.addEventListener === "function"
      && typeof displayModeMediaQueryCompat.removeEventListener === "function"
    ) {
      displayModeMediaQueryCompat.addEventListener("change", onDisplayModeChange);
    } else if (
      displayModeMediaQueryCompat
      && typeof displayModeMediaQueryCompat.addListener === "function"
      && typeof displayModeMediaQueryCompat.removeListener === "function"
    ) {
      displayModeMediaQueryCompat.addListener(onDisplayModeChange);
    }

    const onBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setDeferredPrompt(promptEvent);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      if (
        displayModeMediaQueryCompat
        && typeof displayModeMediaQueryCompat.removeEventListener === "function"
      ) {
        displayModeMediaQueryCompat.removeEventListener("change", onDisplayModeChange);
      } else if (
        displayModeMediaQueryCompat
        && typeof displayModeMediaQueryCompat.removeListener === "function"
      ) {
        displayModeMediaQueryCompat.removeListener(onDisplayModeChange);
      }

      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const canInstall = deferredPrompt !== null && !isInstalled;
  const showIosInstallHint = useMemo(
    () => shouldShowIosInstallHint(isInstalled, canInstall),
    [isInstalled, canInstall],
  );

  const install = useCallback(async (): Promise<InstallResult> => {
    if (!deferredPrompt) return "unavailable";
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return choice.outcome === "accepted" ? "accepted" : "dismissed";
  }, [deferredPrompt]);

  return {
    canInstall,
    isInstalled,
    showIosInstallHint,
    install,
  };
}
