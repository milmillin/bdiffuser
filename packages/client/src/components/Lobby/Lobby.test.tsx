import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LobbyState, MissionId } from "@bomb-busters/shared";
import { Lobby } from "./Lobby.js";

describe("Lobby character selection", () => {
  function makeLobby(mission: MissionId): LobbyState {
    return {
      roomId: "room-1",
      hostId: "p1",
      mission,
      captainMode: "random",
      selectedCaptainId: null,
      players: [
        {
          id: "p1",
          name: "Host",
          character: null,
          isHost: true,
          connected: true,
          isBot: false,
        },
        {
          id: "p2",
          name: "Guest",
          character: null,
          isHost: false,
          connected: true,
          isBot: false,
        },
      ],
    };
  }

  function renderLobby(mission: MissionId): string {
    return renderToStaticMarkup(
      <Lobby
        lobby={makeLobby(mission)}
        send={() => undefined}
        playerId="p1"
        roomId="room-1"
        onLeave={() => undefined}
      />,
    );
  }

  it("omits Character E4 on missions where it is forbidden by setup rules", () => {
    const html = renderLobby(44);

    expect(html).not.toContain("Character E4");
  });

  it("shows Character E4 on missions where it is legal", () => {
    const html = renderLobby(31);

    expect(html).toContain("Character E4");
  });
});
