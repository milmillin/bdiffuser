import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BoardViewOverlay } from "./BoardViewOverlay.js";

describe("BoardViewOverlay", () => {
  it("renders a non-blocking overlay with an interactive back button", () => {
    const html = renderToStaticMarkup(
      <BoardViewOverlay
        onBack={() => undefined}
        buttonClassName="test-button-class"
      />,
    );

    expect(html).toContain("data-testid=\"board-view-overlay\"");
    expect(html).toContain("pointer-events-none");
    expect(html).toContain("data-testid=\"board-view-back-button\"");
    expect(html).toContain("pointer-events-auto");
    expect(html).toContain("Back to Results");
    expect(html).toContain("test-button-class");
  });
});
