import { describe, expect, it } from "vitest";
import {
  getEffectivePreviewAspectRatio,
  getEffectivePreviewRotation,
  type CardPreviewCard,
} from "./CardPreviewModal.js";

function makeBaseCard(overrides: Partial<CardPreviewCard> = {}): CardPreviewCard {
  return {
    name: "Test",
    previewImage: "example.png",
    ...overrides,
  };
}

describe("CardPreviewModal preview rotation/aspect resolution", () => {
  it("uses deprecated previewRotateCcw90 when no new rotation prop is set", () => {
    const card = makeBaseCard({ previewRotateCcw90: true });
    expect(getEffectivePreviewRotation(card, false)).toBe("ccw90");
  });

  it("prefers explicit previewRotation over deprecated rotate flag", () => {
    const card = makeBaseCard({
      previewRotation: "cw90",
      previewRotateCcw90: true,
    });
    expect(getEffectivePreviewRotation(card, false)).toBe("cw90");
  });

  it("uses mobile rotation/aspect overrides on mobile only", () => {
    const card = makeBaseCard({
      previewAspectRatio: "739/1040",
      previewMobileAspectRatio: "1037/736",
      previewRotation: "none",
      previewMobileRotation: "ccw90",
    });
    expect(getEffectivePreviewRotation(card, false)).toBe("none");
    expect(getEffectivePreviewRotation(card, true)).toBe("ccw90");
    expect(getEffectivePreviewAspectRatio(card, false)).toBe("739/1040");
    expect(getEffectivePreviewAspectRatio(card, true)).toBe("1037/736");
  });
});
