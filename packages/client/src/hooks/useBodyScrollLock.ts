import { useEffect } from "react";
import { lockBodyScroll, unlockBodyScroll } from "../utils/bodyScrollLock.js";

export function useBodyScrollLock(shouldLock: boolean): void {
  useEffect(() => {
    if (!shouldLock) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [shouldLock]);
}
