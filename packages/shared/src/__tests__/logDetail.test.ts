import { describe, expect, it } from "vitest";
import { logTemplate, logText, renderLogDetail } from "../logDetail";

describe("log detail rendering", () => {
  it("renders plain text details unchanged", () => {
    expect(renderLogDetail(logText("hello"))).toBe("hello");
  });

  it("renders coffee mug template with resolved player name", () => {
    const detail = logTemplate("equipment.coffee_mug.pass_turn", {
      targetPlayerId: "p2",
    });

    expect(
      renderLogDetail(detail, (playerId) => (playerId === "p2" ? "Bob" : playerId)),
    ).toBe("used Coffee Mug and passed turn to Bob");
  });

  it("renders designate cutter template with explicit target player name", () => {
    const detail = logTemplate("designate_cutter.selected", {
      targetPlayerName: "Bob",
    });

    expect(renderLogDetail(detail, () => "ignored")).toBe("designated Bob to cut");
  });

  it("renders designate cutter template from target player id for backwards compatibility", () => {
    const detail = logTemplate("designate_cutter.selected", {
      targetPlayerId: "p2",
    });

    expect(
      renderLogDetail(detail, (playerId) => (playerId === "p2" ? "Bob" : playerId)),
    ).toBe("designated Bob to cut");
  });

  it("renders designate cutter with placeholder when resolver returns the player ID", () => {
    const detail = logTemplate("designate_cutter.selected", {
      targetPlayerId: "p2",
    });

    expect(renderLogDetail(detail, (playerId) => playerId)).toBe(
      "designated that player to cut",
    );
  });

  it("renders designate cutter with placeholder when resolver returns empty text", () => {
    const detail = logTemplate("designate_cutter.selected", {
      targetPlayerId: "p2",
    });

    expect(renderLogDetail(detail, () => "   ")).toBe("designated that player to cut");
  });

  it("renders m15.number_complete with equipment and next card", () => {
    const detail = logTemplate("m15.number_complete", {
      completedValue: 4,
      revealedEquipment: "Rewinder",
      revealedEquipmentId: "rewinder",
      nextValue: 7,
      hasNext: true,
      skipped: "9, 11",
      hasSkipped: true,
    });

    expect(renderLogDetail(detail)).toBe(
      "All 4s cut — Rewinder revealed — next number card: 7",
    );
  });

  it("renders m15.number_complete without equipment", () => {
    const detail = logTemplate("m15.number_complete", {
      completedValue: 6,
      revealedEquipment: "none",
      revealedEquipmentId: "none",
      nextValue: 0,
      hasNext: false,
      skipped: "none",
      hasSkipped: false,
    });

    expect(renderLogDetail(detail)).toBe("All 6s cut");
  });

  it("renders m15.number_complete with equipment but no next card", () => {
    const detail = logTemplate("m15.number_complete", {
      completedValue: 12,
      revealedEquipment: "Label ≠",
      revealedEquipmentId: "label_neq",
      nextValue: 0,
      hasNext: false,
      skipped: "none",
      hasSkipped: false,
    });

    expect(renderLogDetail(detail)).toBe("All 12s cut — Label ≠ revealed");
  });
});
