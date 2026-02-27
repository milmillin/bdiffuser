import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MissionId } from "@bomb-busters/shared";
import { makeBoardState } from "@bomb-busters/shared/testing";
import { BoardArea } from "./BoardArea.js";

function renderBoardArea(missionId: MissionId, playerCount: number): string {
  return renderToStaticMarkup(
    <BoardArea
      board={makeBoardState()}
      missionId={missionId}
      playerCount={playerCount}
    />,
  );
}

describe("BoardArea top-bar marker counters", () => {
  it("shows both red and yellow counters when both setups are uncertain", () => {
    const html = renderBoardArea(8, 4);

    expect(html).toContain("data-testid=\"red-wire-count\"");
    expect(html).toContain("data-testid=\"yellow-wire-count\"");
  });

  it("shows only red counter when only red setup is uncertain", () => {
    const html = renderBoardArea(7, 4);

    expect(html).toContain("data-testid=\"red-wire-count\"");
    expect(html).not.toContain("data-testid=\"yellow-wire-count\"");
  });

  it("shows only yellow counter when only yellow setup is uncertain", () => {
    const html = renderBoardArea(16, 4);

    expect(html).not.toContain("data-testid=\"red-wire-count\"");
    expect(html).toContain("data-testid=\"yellow-wire-count\"");
  });

  it("hides yellow counter when yellow setup is already fully revealed", () => {
    const html = renderBoardArea(2, 4);

    expect(html).not.toContain("data-testid=\"yellow-wire-count\"");
  });

  it("hides yellow counter in an override that removes setup uncertainty", () => {
    const html = renderBoardArea(8, 2);

    expect(html).toContain("data-testid=\"red-wire-count\"");
    expect(html).not.toContain("data-testid=\"yellow-wire-count\"");
  });

  it("hides both counters when both setups are already fully revealed", () => {
    const html = renderBoardArea(66, 4);

    expect(html).not.toContain("data-testid=\"red-wire-count\"");
    expect(html).not.toContain("data-testid=\"yellow-wire-count\"");
  });
});
