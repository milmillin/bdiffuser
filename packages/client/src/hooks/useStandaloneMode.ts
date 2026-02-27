import { useEffect, useState } from "react";

const IOS_DEVICE_PATTERN = /(iphone|ipad|ipod)/i;
const STANDALONE_QUERY = "(display-mode: standalone)";

type MediaQueryListCompat = MediaQueryList & {
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
};

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return IOS_DEVICE_PATTERN.test(navigator.userAgent);
}

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;
  const inDisplayModeStandalone =
    typeof window.matchMedia === "function"
    && window.matchMedia(STANDALONE_QUERY).matches;
  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };
  const inIosStandalone = navigatorWithStandalone.standalone === true;
  return inDisplayModeStandalone || inIosStandalone;
}

export function isIosStandalonePwa(): boolean {
  return isIosDevice() && isStandaloneDisplayMode();
}

export function useIsIosStandalonePwa(): boolean {
  const [isIosStandalone, setIsIosStandalone] = useState<boolean>(
    () => isIosStandalonePwa(),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncStandaloneState = () => setIsIosStandalone(isIosStandalonePwa());
    syncStandaloneState();

    const displayModeMediaQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia(STANDALONE_QUERY)
        : null;
    const displayModeMediaQueryCompat =
      displayModeMediaQuery as MediaQueryListCompat | null;
    const onDisplayModeChange = () => syncStandaloneState();

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

    window.addEventListener("focus", syncStandaloneState);
    window.addEventListener("pageshow", syncStandaloneState);

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

      window.removeEventListener("focus", syncStandaloneState);
      window.removeEventListener("pageshow", syncStandaloneState);
    };
  }, []);

  return isIosStandalone;
}
