import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getBodyScrollLockCount,
  lockBodyScroll,
  resetBodyScrollLockStateForTests,
  unlockBodyScroll,
} from "./bodyScrollLock.js";

const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalDocumentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");

function restoreGlobalProperty(
  key: "window" | "document",
  descriptor: PropertyDescriptor | undefined,
) {
  if (descriptor) {
    Object.defineProperty(globalThis, key, descriptor);
    return;
  }
  Reflect.deleteProperty(globalThis, key);
}

function setDomContext({
  scrollX,
  scrollY,
  style,
  scrollTo,
}: {
  scrollX: number;
  scrollY: number;
  style: {
    overflow: string;
    position: string;
    top: string;
    left: string;
    right: string;
    width: string;
  };
  scrollTo: (x: number, y: number) => void;
}) {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: {
      scrollX,
      scrollY,
      scrollTo,
    },
  });

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    writable: true,
    value: {
      body: {
        style,
      },
    },
  });
}

beforeEach(() => {
  resetBodyScrollLockStateForTests();
});

afterEach(() => {
  restoreGlobalProperty("window", originalWindowDescriptor);
  restoreGlobalProperty("document", originalDocumentDescriptor);
  resetBodyScrollLockStateForTests();
  vi.restoreAllMocks();
});

describe("body scroll lock", () => {
  it("locks and restores body styles with original scroll position", () => {
    const scrollTo = vi.fn();
    const style = {
      overflow: "auto",
      position: "",
      top: "",
      left: "",
      right: "",
      width: "",
    };
    setDomContext({ scrollX: 14, scrollY: 92, style, scrollTo });

    lockBodyScroll();

    expect(getBodyScrollLockCount()).toBe(1);
    expect(style.overflow).toBe("hidden");
    expect(style.position).toBe("fixed");
    expect(style.top).toBe("-92px");
    expect(style.left).toBe("0");
    expect(style.right).toBe("0");
    expect(style.width).toBe("100%");

    unlockBodyScroll();

    expect(getBodyScrollLockCount()).toBe(0);
    expect(style.overflow).toBe("auto");
    expect(style.position).toBe("");
    expect(style.top).toBe("");
    expect(style.left).toBe("");
    expect(style.right).toBe("");
    expect(style.width).toBe("");
    expect(scrollTo).toHaveBeenCalledWith(14, 92);
  });

  it("keeps lock active until the final unlock call", () => {
    const scrollTo = vi.fn();
    const style = {
      overflow: "",
      position: "",
      top: "",
      left: "",
      right: "",
      width: "",
    };
    setDomContext({ scrollX: 3, scrollY: 40, style, scrollTo });

    lockBodyScroll();
    lockBodyScroll();

    expect(getBodyScrollLockCount()).toBe(2);
    expect(style.position).toBe("fixed");

    unlockBodyScroll();

    expect(getBodyScrollLockCount()).toBe(1);
    expect(style.position).toBe("fixed");
    expect(scrollTo).not.toHaveBeenCalled();

    unlockBodyScroll();

    expect(getBodyScrollLockCount()).toBe(0);
    expect(style.position).toBe("");
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith(3, 40);
  });
});
