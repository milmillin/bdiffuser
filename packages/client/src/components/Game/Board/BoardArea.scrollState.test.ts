import { describe, expect, it } from "vitest";
import { deriveHorizontalScrollState } from "./BoardArea.js";

describe("deriveHorizontalScrollState", () => {
  it("reports right overflow at the left edge", () => {
    const state = deriveHorizontalScrollState({
      scrollLeft: 0,
      clientWidth: 240,
      scrollWidth: 480,
    });

    expect(state.hasOverflow).toBe(true);
    expect(state.canScrollLeft).toBe(false);
    expect(state.canScrollRight).toBe(true);
    expect(state.shouldResetScroll).toBe(false);
  });

  it("reports left overflow at the right edge", () => {
    const state = deriveHorizontalScrollState({
      scrollLeft: 240,
      clientWidth: 240,
      scrollWidth: 480,
    });

    expect(state.hasOverflow).toBe(true);
    expect(state.canScrollLeft).toBe(true);
    expect(state.canScrollRight).toBe(false);
    expect(state.shouldResetScroll).toBe(false);
  });

  it("requests reset when prior scroll offset remains after shrink-to-fit", () => {
    const state = deriveHorizontalScrollState({
      scrollLeft: 36,
      clientWidth: 360,
      scrollWidth: 360,
    });

    expect(state.hasOverflow).toBe(false);
    expect(state.canScrollLeft).toBe(false);
    expect(state.canScrollRight).toBe(false);
    expect(state.shouldResetScroll).toBe(true);
  });

  it("stays stable with exact fit at origin", () => {
    const state = deriveHorizontalScrollState({
      scrollLeft: 0,
      clientWidth: 360,
      scrollWidth: 360,
    });

    expect(state.hasOverflow).toBe(false);
    expect(state.canScrollLeft).toBe(false);
    expect(state.canScrollRight).toBe(false);
    expect(state.shouldResetScroll).toBe(false);
  });
});
