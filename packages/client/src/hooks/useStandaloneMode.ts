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

function subscribeStandaloneChanges(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const displayModeMediaQuery =
    typeof window.matchMedia === "function"
      ? window.matchMedia(STANDALONE_QUERY)
      : null;
  const displayModeMediaQueryCompat =
    displayModeMediaQuery as MediaQueryListCompat | null;

  if (
    displayModeMediaQueryCompat
    && typeof displayModeMediaQueryCompat.addEventListener === "function"
    && typeof displayModeMediaQueryCompat.removeEventListener === "function"
  ) {
    displayModeMediaQueryCompat.addEventListener("change", onChange);
  } else if (
    displayModeMediaQueryCompat
    && typeof displayModeMediaQueryCompat.addListener === "function"
    && typeof displayModeMediaQueryCompat.removeListener === "function"
  ) {
    displayModeMediaQueryCompat.addListener(onChange);
  }

  window.addEventListener("focus", onChange);
  window.addEventListener("pageshow", onChange);

  return () => {
    if (
      displayModeMediaQueryCompat
      && typeof displayModeMediaQueryCompat.removeEventListener === "function"
    ) {
      displayModeMediaQueryCompat.removeEventListener("change", onChange);
    } else if (
      displayModeMediaQueryCompat
      && typeof displayModeMediaQueryCompat.removeListener === "function"
    ) {
      displayModeMediaQueryCompat.removeListener(onChange);
    }

    window.removeEventListener("focus", onChange);
    window.removeEventListener("pageshow", onChange);
  };
}

function useStandaloneModeValue(getValue: () => boolean): boolean {
  const [value, setValue] = useState<boolean>(() => getValue());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncState = () => setValue(getValue());
    syncState();

    return subscribeStandaloneChanges(syncState);
  }, [getValue]);

  return value;
}

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

export function useIsStandalonePwa(): boolean {
  return useStandaloneModeValue(isStandaloneDisplayMode);
}

export function useIsIosStandalonePwa(): boolean {
  return useStandaloneModeValue(isIosStandalonePwa);
}
