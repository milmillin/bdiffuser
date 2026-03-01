import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { logText, type GameLogEntry } from "@bomb-busters/shared";
import { ActionLog } from "./ActionLog.js";

function renderActionLog(log: GameLogEntry[]): string {
  return renderToStaticMarkup(
    <ActionLog
      log={log}
      players={[
        {
          id: "e1e43f07-d675-4d9c-bce7-00d5106fbc92",
          name: "T6mek",
          character: null,
          isCaptain: true,
          hand: [],
          standSizes: [0],
          infoTokens: [],
          characterUsed: false,
          connected: true,
          isBot: false,
          remainingTiles: 0,
        },
      ]}
      result={null}
    />,
  );
}

describe("ActionLog UUID masking", () => {
  it("replaces known player UUIDs in text log details with names", () => {
    const log: GameLogEntry[] = [
      {
        turn: 2,
        playerId: "e1e43f07-d675-4d9c-bce7-00d5106fbc92",
        action: "hookEffect",
        detail: logText(
          "m27:token_draft:value=3|chooser=e1e43f07-d675-4d9c-bce7-00d5106fbc92|position=stand",
        ),
        timestamp: Date.now(),
      },
    ];
    const html = renderActionLog(log);

    expect(html).toContain("chooser=T6mek");
    expect(html).not.toContain("e1e43f07-d675-4d9c-bce7-00d5106fbc92");
  });

  it("replaces unknown UUID-like values with 'unknown'", () => {
    const log: GameLogEntry[] = [
      {
        turn: 4,
        playerId: "e1e43f07-d675-4d9c-bce7-00d5106fbc92",
        action: "hookEffect",
        detail: logText(
          "m22:token_pass:value=2|to=b90afd82-e9c8-487c-9b57-2584e183485f|position=stand",
        ),
        timestamp: Date.now(),
      },
    ];
    const html = renderActionLog(log);

    expect(html).toContain("to=unknown");
    expect(html).not.toContain("b90afd82-e9c8-487c-9b57-2584e183485f");
  });
});
