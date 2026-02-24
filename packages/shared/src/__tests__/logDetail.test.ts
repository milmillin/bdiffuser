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
});
