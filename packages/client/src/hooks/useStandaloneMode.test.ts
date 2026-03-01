import { afterEach, describe, expect, it, vi } from "vitest";
import { isIosStandalonePwa, isStandaloneDisplayMode } from "./useStandaloneMode.js";

const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");

function restoreGlobalProperty(
  key: "window" | "navigator",
  descriptor: PropertyDescriptor | undefined,
) {
  if (descriptor) {
    Object.defineProperty(globalThis, key, descriptor);
    return;
  }
  Reflect.deleteProperty(globalThis, key);
}

function setBrowserContext({
  userAgent,
  standalone = false,
  displayModeStandalone,
}: {
  userAgent: string;
  standalone?: boolean;
  displayModeStandalone: boolean;
}) {
  const matchMedia = vi.fn().mockReturnValue({
    matches: displayModeStandalone,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  });

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: {
      matchMedia,
    },
  });

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    writable: true,
    value: {
      userAgent,
      standalone,
    },
  });
}

afterEach(() => {
  restoreGlobalProperty("window", originalWindowDescriptor);
  restoreGlobalProperty("navigator", originalNavigatorDescriptor);
  vi.restoreAllMocks();
});

describe("standalone mode detection", () => {
  it("detects standalone mode via display-mode media query", () => {
    setBrowserContext({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)",
      displayModeStandalone: true,
    });

    expect(isStandaloneDisplayMode()).toBe(true);
  });

  it("detects standalone mode via iOS navigator.standalone", () => {
    setBrowserContext({
      userAgent: "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X)",
      standalone: true,
      displayModeStandalone: false,
    });

    expect(isStandaloneDisplayMode()).toBe(true);
  });

  it("returns false when no standalone signal exists", () => {
    setBrowserContext({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)",
      displayModeStandalone: false,
    });

    expect(isStandaloneDisplayMode()).toBe(false);
  });

  it("flags iOS standalone PWA only for iOS user agents", () => {
    setBrowserContext({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)",
      displayModeStandalone: true,
    });
    expect(isIosStandalonePwa()).toBe(true);

    setBrowserContext({
      userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9)",
      displayModeStandalone: true,
    });
    expect(isStandaloneDisplayMode()).toBe(true);
    expect(isIosStandalonePwa()).toBe(false);
  });
});
