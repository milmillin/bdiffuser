import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ClientGameState } from "@bomb-busters/shared";
import { makeGameState } from "@bomb-busters/shared/testing";
import { EndScreen } from "./EndScreen.js";

function makeEndState(overrides: Partial<ClientGameState> = {}): ClientGameState {
  return {
    ...makeGameState({
      phase: "finished",
      result: "loss_red_wire",
      players: [{
        id: "p1",
        name: "Pilot",
        hand: [],
        standSizes: [0],
        infoTokens: [],
        character: null,
        isCaptain: false,
        connected: true,
        isBot: false,
        characterUsed: false,
      }],
    }),
    ...overrides,
    result: overrides.result ?? "loss_red_wire",
  } as ClientGameState;
}

describe("EndScreen", () => {
  it("hides Play Again for spectators", () => {
    const html = renderToStaticMarkup(
      <EndScreen
        gameState={makeEndState({
          isSpectator: true,
        })}
        onPlayAgain={() => undefined}
      />, 
    );

    expect(html).not.toContain("data-testid=\"play-again\"");
    expect(html).not.toContain("Play Again");
  });

  it("renders Play Again for players", () => {
    const html = renderToStaticMarkup(
      <EndScreen
        gameState={makeEndState({
          playerId: "p1",
          isSpectator: false,
        })}
        onPlayAgain={() => undefined}
      />,
    );

    expect(html).toContain("data-testid=\"play-again\"");
    expect(html).toContain("Play Again");
  });

  it("renders View Board action", () => {
    const html = renderToStaticMarkup(
      <EndScreen
        gameState={makeEndState({
          playerId: "p1",
          isSpectator: false,
        })}
        onPlayAgain={() => undefined}
      />,
    );

    expect(html).toContain("View Board");
  });
});
