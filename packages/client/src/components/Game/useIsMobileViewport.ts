import { useEffect, useState } from "react";

export function isViewportMatch(query: string): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(query).matches;
}

export function useIsMobileViewport(query = "(max-width: 639px)"): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => isViewportMatch(query));

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia(query);
    const mediaQueryCompat = mediaQuery as MediaQueryList & {
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
    const onChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };
    setIsMobile(mediaQuery.matches);
    if (
      typeof mediaQueryCompat.addEventListener === "function"
      && typeof mediaQueryCompat.removeEventListener === "function"
    ) {
      mediaQueryCompat.addEventListener("change", onChange);
      return () => mediaQueryCompat.removeEventListener("change", onChange);
    }
    if (
      typeof mediaQueryCompat.addListener === "function"
      && typeof mediaQueryCompat.removeListener === "function"
    ) {
      mediaQueryCompat.addListener(onChange);
      return () => mediaQueryCompat.removeListener(onChange);
    }
    return;
  }, [query]);

  return isMobile;
}
