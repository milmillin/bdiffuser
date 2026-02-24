import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ClientGameState } from "@bomb-busters/shared";
import {
  makeGameState,
  makePlayer,
  makeTile,
} from "@bomb-busters/shared/testing";
import { EquipmentModePanel } from "./EquipmentModePanel.js";
import type { EquipmentMode } from "./EquipmentModePanel.js";

function renderMode(
  mode: EquipmentMode,
  overrides?: {
    playerId?: string;
    players?: ReturnType<typeof makePlayer>[];
  },
): string {
  const players = overrides?.players ?? [
    makePlayer({
      id: "me",
      name: "Me",
      hand: [
        makeTile({ id: "t1", gameValue: 3 }),
        makeTile({ id: "t2", gameValue: 5 }),
        makeTile({ id: "t3", gameValue: 7 }),
      ],
    }),
    makePlayer({ id: "opp1", name: "Opp1" }),
    makePlayer({ id: "opp2", name: "Opp2" }),
  ];
  const gs = makeGameState({
    players,
    currentPlayerIndex: 0,
  }) as unknown as ClientGameState;
  return renderToStaticMarkup(
    <EquipmentModePanel
      mode={mode}
      gameState={gs}
      playerId={overrides?.playerId ?? "me"}
      send={vi.fn()}
      onCancel={vi.fn()}
      onUpdateMode={vi.fn()}
    />,
  );
}

// ── Default initial modes for iteration ──────────────────────────────────────

const ALL_MODES: EquipmentMode[] = [
  { kind: "post_it" },
  {
    kind: "double_detector",
    targetPlayerId: null,
    selectedTiles: [],
    guessTileIndex: null,
  },
  { kind: "general_radar", selectedValue: null },
  { kind: "label_eq", firstTileIndex: null },
  { kind: "label_neq", firstTileIndex: null },
  {
    kind: "talkies_walkies",
    teammateId: null,
    teammateTileIndex: null,
    myTileIndex: null,
  },
  { kind: "emergency_batteries", selectedPlayerIds: [] },
  { kind: "coffee_mug", selectedPlayerId: null },
  {
    kind: "triple_detector",
    targetPlayerId: null,
    targetTileIndices: [],
    guessTileIndex: null,
  },
  {
    kind: "super_detector",
    targetPlayerId: null,
    guessTileIndex: null,
  },
  {
    kind: "x_or_y_ray",
    targetPlayerId: null,
    targetTileIndex: null,
    guessATileIndex: null,
    guessBTileIndex: null,
  },
  { kind: "false_bottom" },
  { kind: "single_wire_label" },
  { kind: "emergency_drop" },
  { kind: "fast_pass", selectedValue: null },
  { kind: "disintegrator" },
  {
    kind: "grappling_hook",
    targetPlayerId: null,
    targetTileIndex: null,
  },
];

const MODE_TITLES: Record<EquipmentMode["kind"], string> = {
  post_it: "Post-it Mode",
  double_detector: "Double Detector Mode",
  general_radar: "General Radar",
  label_eq: "Label = Mode",
  label_neq: "Label ≠ Mode",
  talkies_walkies: "Talkies-Walkies",
  emergency_batteries: "Emergency Batteries",
  coffee_mug: "Coffee Mug",
  triple_detector: "Triple Detector",
  super_detector: "Super Detector",
  x_or_y_ray: "X or Y Ray",
  false_bottom: "False Bottom",
  single_wire_label: "Single Wire Label",
  emergency_drop: "Emergency Drop",
  fast_pass: "Fast Pass",
  disintegrator: "Disintegrator",
  grappling_hook: "Grappling Hook",
};

// ── General tests ────────────────────────────────────────────────────────────

describe("EquipmentModePanel — General", () => {
  it.each(ALL_MODES.map((m) => [m.kind, m] as const))(
    "renders Cancel button for %s",
    (_kind, mode) => {
      // emergency_batteries needs characterUsed players to show content,
      // but Cancel is always rendered by ModeWrapper regardless
      const html = renderMode(mode);
      expect(html).toContain("Cancel");
    },
  );

  it.each(ALL_MODES.map((m) => [m.kind, m] as const))(
    "renders title for %s",
    (kind, mode) => {
      const html = renderMode(mode);
      expect(html).toContain(MODE_TITLES[kind]);
    },
  );
});

// ── post_it ──────────────────────────────────────────────────────────────────

describe("EquipmentModePanel — post_it", () => {
  it("shows instruction to click a blue wire", () => {
    const html = renderMode({ kind: "post_it" });
    expect(html).toContain("Click one of your blue wires");
    expect(html).toContain("data-testid=\"post-it-mode-panel\"");
  });
});

// ── double_detector ──────────────────────────────────────────────────────────

describe("EquipmentModePanel — double_detector", () => {
  it("initial state shows still-need text", () => {
    const html = renderMode({
      kind: "double_detector",
      targetPlayerId: null,
      selectedTiles: [],
      guessTileIndex: null,
    });
    expect(html).toContain("Still need:");
    expect(html).toContain("opponent tile(s)");
    expect(html).toContain("data-testid=\"dd-mode-panel\"");
  });

  it("with 2 tiles selected but no guess shows still-need guess", () => {
    const html = renderMode({
      kind: "double_detector",
      targetPlayerId: "opp1",
      selectedTiles: [0, 1],
      guessTileIndex: null,
    });
    expect(html).toContain("Still need:");
    expect(html).toContain("guess tile");
  });

  it("with guess set shows confirm button", () => {
    const html = renderMode({
      kind: "double_detector",
      targetPlayerId: "opp1",
      selectedTiles: [0, 1],
      guessTileIndex: 0,
    });
    expect(html).toContain("data-testid=\"dd-confirm\"");
    expect(html).toContain("Confirm Double Detector");
  });
});

// ── general_radar ────────────────────────────────────────────────────────────

describe("EquipmentModePanel — general_radar", () => {
  it("renders 12 numbered buttons (1 through 12) and no confirm before selection", () => {
    const html = renderMode({ kind: "general_radar", selectedValue: null });
    for (let i = 1; i <= 12; i++) {
      expect(html).toContain(`>${i}</button>`);
    }
    expect(html).not.toContain("Confirm General Radar");
    expect(html).toContain("data-testid=\"equipment-mode-panel\"");
  });

  it("shows confirm button after a value is selected", () => {
    const html = renderMode({ kind: "general_radar", selectedValue: 5 });
    expect(html).toContain("Confirm General Radar");
  });
});

// ── label_eq ─────────────────────────────────────────────────────────────────

describe("EquipmentModePanel — label_eq", () => {
  it("step 1: shows instruction to click an uncut wire", () => {
    const html = renderMode({ kind: "label_eq", firstTileIndex: null });
    expect(html).toContain("Click one of your uncut wires");
  });

  it("step 2: shows adjacent text after selecting a wire", () => {
    const html = renderMode({ kind: "label_eq", firstTileIndex: 1 });
    expect(html).toContain("adjacent");
  });
});

// ── label_neq ────────────────────────────────────────────────────────────────

describe("EquipmentModePanel — label_neq", () => {
  it("step 1: shows instruction to click a wire", () => {
    const html = renderMode({ kind: "label_neq", firstTileIndex: null });
    expect(html).toContain("Click one of your wires");
  });

  it("step 2: shows adjacent text after selecting a wire", () => {
    const html = renderMode({ kind: "label_neq", firstTileIndex: 1 });
    expect(html).toContain("adjacent");
  });
});

// ── talkies_walkies ──────────────────────────────────────────────────────────

describe("EquipmentModePanel — talkies_walkies", () => {
  it("initial state shows still-need text", () => {
    const html = renderMode({
      kind: "talkies_walkies",
      teammateId: null,
      teammateTileIndex: null,
      myTileIndex: null,
    });
    expect(html).toContain("Still need:");
    expect(html).toContain("opponent");
    expect(html).toContain("uncut wire");
  });

  it("with teammate selected shows Selected name and still need your wire", () => {
    const html = renderMode({
      kind: "talkies_walkies",
      teammateId: "opp1",
      teammateTileIndex: 0,
      myTileIndex: null,
    });
    expect(html).toContain("Selected");
    expect(html).toContain("Opp1");
    expect(html).toContain("Still need:");
    expect(html).toContain("your uncut wire");
  });

  it("with all selections shows confirm button", () => {
    const html = renderMode({
      kind: "talkies_walkies",
      teammateId: "opp1",
      teammateTileIndex: 0,
      myTileIndex: 1,
    });
    expect(html).toContain("Confirm Talkies-Walkies");
    expect(html).toContain("data-testid=\"tw-confirm\"");
  });
});

// ── emergency_batteries ──────────────────────────────────────────────────────

describe("EquipmentModePanel — emergency_batteries", () => {
  it("shows no-eligible message when no players have characterUsed", () => {
    const html = renderMode({
      kind: "emergency_batteries",
      selectedPlayerIds: [],
    });
    expect(html).toContain("No players have used character abilities");
  });

  it("shows player buttons when some players have characterUsed", () => {
    const html = renderMode(
      { kind: "emergency_batteries", selectedPlayerIds: [] },
      {
        players: [
          makePlayer({
            id: "me",
            name: "Me",
            hand: [makeTile({ id: "t1", gameValue: 3 })],
            characterUsed: true,
          }),
          makePlayer({ id: "opp1", name: "Opp1", characterUsed: true }),
          makePlayer({ id: "opp2", name: "Opp2", characterUsed: false }),
        ],
      },
    );
    expect(html).toContain("Me");
    expect(html).toContain("Opp1");
    expect(html).toContain("Select 1");
  });

  it("shows Confirm button when at least one player is selected", () => {
    const html = renderMode(
      { kind: "emergency_batteries", selectedPlayerIds: ["opp1"] },
      {
        players: [
          makePlayer({
            id: "me",
            name: "Me",
            hand: [makeTile({ id: "t1", gameValue: 3 })],
          }),
          makePlayer({ id: "opp1", name: "Opp1", characterUsed: true }),
          makePlayer({ id: "opp2", name: "Opp2", characterUsed: false }),
        ],
      },
    );
    expect(html).toContain("Confirm");
    expect(html).toContain("1 selected");
  });
});

// ── coffee_mug ───────────────────────────────────────────────────────────

describe("EquipmentModePanel — coffee_mug", () => {
  it("shows player buttons excluding self and no confirm before selection", () => {
    const html = renderMode({ kind: "coffee_mug", selectedPlayerId: null });
    expect(html).toContain("Opp1");
    expect(html).toContain("Opp2");
    expect(html).toContain("Choose a player to give the next turn to");
    expect(html).not.toContain("Confirm Coffee Mug");
  });

  it("shows confirm button after a player is selected", () => {
    const html = renderMode({ kind: "coffee_mug", selectedPlayerId: "opp1" });
    expect(html).toContain("Confirm Coffee Mug");
  });

  it("excludes players whose tiles are all cut", () => {
    const html = renderMode(
      { kind: "coffee_mug", selectedPlayerId: null },
      {
        players: [
          makePlayer({
            id: "me",
            name: "Me",
            hand: [makeTile({ id: "t1", gameValue: 3 })],
          }),
          makePlayer({
            id: "opp1",
            name: "Opp1",
            hand: [makeTile({ id: "o1", cut: true })],
          }),
          makePlayer({
            id: "opp2",
            name: "Opp2",
            hand: [makeTile({ id: "o2", cut: false })],
          }),
        ],
      },
    );
    // Opp1 has all tiles cut, so should be excluded
    expect(html).not.toContain(">Opp1</button>");
    expect(html).toContain(">Opp2</button>");
  });
});

// ── triple_detector ──────────────────────────────────────────────────────────

describe("EquipmentModePanel — triple_detector", () => {
  it("initial state shows still-need text", () => {
    const html = renderMode({
      kind: "triple_detector",
      targetPlayerId: null,
      targetTileIndices: [],
      guessTileIndex: null,
    });
    expect(html).toContain("Still need:");
    expect(html).toContain("opponent tile(s)");
  });

  it("with 3 tiles selected but no guess shows still-need guess", () => {
    const html = renderMode({
      kind: "triple_detector",
      targetPlayerId: "opp1",
      targetTileIndices: [0, 1, 2],
      guessTileIndex: null,
    });
    expect(html).toContain("Still need:");
    expect(html).toContain("guess tile");
  });

  it("with guess set shows confirm button", () => {
    const html = renderMode({
      kind: "triple_detector",
      targetPlayerId: "opp1",
      targetTileIndices: [0, 1, 2],
      guessTileIndex: 0,
    });
    expect(html).toContain("Confirm Triple Detector");
  });
});

// ── super_detector ───────────────────────────────────────────────────────────

describe("EquipmentModePanel — super_detector", () => {
  it("initial state shows still-need text", () => {
    const html = renderMode({
      kind: "super_detector",
      targetPlayerId: null,
      guessTileIndex: null,
    });
    expect(html).toContain("Still need:");
    expect(html).toContain("opponent");
  });

  it("with target player shows Selected and opponent name", () => {
    const html = renderMode({
      kind: "super_detector",
      targetPlayerId: "opp1",
      guessTileIndex: null,
    });
    expect(html).toContain("Selected");
    expect(html).toContain("Opp1");
  });

  it("with guess set shows confirm button", () => {
    const html = renderMode({
      kind: "super_detector",
      targetPlayerId: "opp1",
      guessTileIndex: 0,
    });
    expect(html).toContain("Confirm Super Detector");
  });
});

// ── x_or_y_ray ───────────────────────────────────────────────────────────────

describe("EquipmentModePanel — x_or_y_ray", () => {
  it("initial state shows still-need text", () => {
    const html = renderMode({
      kind: "x_or_y_ray",
      targetPlayerId: null,
      targetTileIndex: null,
      guessATileIndex: null,
      guessBTileIndex: null,
    });
    expect(html).toContain("Still need:");
    expect(html).toContain("opponent");
  });

  it("targeting step shows Selected and opponent name", () => {
    const html = renderMode({
      kind: "x_or_y_ray",
      targetPlayerId: "opp1",
      targetTileIndex: 0,
      guessATileIndex: null,
      guessBTileIndex: null,
    });
    expect(html).toContain("Selected");
    expect(html).toContain("Opp1");
  });

  it("first value step shows value A text", () => {
    const html = renderMode({
      kind: "x_or_y_ray",
      targetPlayerId: "opp1",
      targetTileIndex: 0,
      guessATileIndex: 0,
      guessBTileIndex: null,
    });
    expect(html).toContain("value A:");
    expect(html).toContain("3");
  });

  it("final step shows confirm button", () => {
    const html = renderMode({
      kind: "x_or_y_ray",
      targetPlayerId: "opp1",
      targetTileIndex: 0,
      guessATileIndex: 0,
      guessBTileIndex: 1,
    });
    expect(html).toContain("Confirm X or Y Ray");
  });
});

// ── false_bottom ─────────────────────────────────────────────────────────────

describe("EquipmentModePanel — false_bottom", () => {
  it("shows description and confirm button", () => {
    const html = renderMode({ kind: "false_bottom" });
    expect(html).toContain("Reveal a random equipment card from the reserve");
    expect(html).toContain("Confirm False Bottom");
  });
});

// ── single_wire_label ────────────────────────────────────────────────────────

describe("EquipmentModePanel — single_wire_label", () => {
  it("shows instruction text", () => {
    const html = renderMode({ kind: "single_wire_label" });
    expect(html).toContain("Click one of your blue wires to apply the Single Wire Label");
  });
});

// ── emergency_drop ───────────────────────────────────────────────────────────

describe("EquipmentModePanel — emergency_drop", () => {
  it("shows description and confirm button", () => {
    const html = renderMode({ kind: "emergency_drop" });
    expect(html).toContain("Restore all used equipment cards");
    expect(html).toContain("Confirm Emergency Drop");
  });
});

// ── fast_pass ────────────────────────────────────────────────────────────────

describe("EquipmentModePanel — fast_pass", () => {
  it("renders value buttons and no confirm button before selection", () => {
    const html = renderMode({ kind: "fast_pass", selectedValue: null });
    for (let i = 1; i <= 12; i++) {
      expect(html).toContain(`>${i}</button>`);
    }
    expect(html).not.toContain("Confirm Fast Pass");
  });

  it("shows confirm button after a value is selected", () => {
    const html = renderMode({ kind: "fast_pass", selectedValue: 7 });
    expect(html).toContain("Confirm Fast Pass");
  });
});

// ── disintegrator ────────────────────────────────────────────────────────────

describe("EquipmentModePanel — disintegrator", () => {
  it("shows description and confirm button", () => {
    const html = renderMode({ kind: "disintegrator" });
    expect(html).toContain("Draw a random value and cut all matching blue wires");
    expect(html).toContain("Confirm Disintegrator");
  });
});

// ── grappling_hook ───────────────────────────────────────────────────────────

describe("EquipmentModePanel — grappling_hook", () => {
  it("initial state shows opponent-click instruction", () => {
    const html = renderMode({
      kind: "grappling_hook",
      targetPlayerId: null,
      targetTileIndex: null,
    });
    expect(html).toContain("Click an uncut wire on an opponent");
  });

  it("with target selected shows targeting text and confirm button", () => {
    const html = renderMode({
      kind: "grappling_hook",
      targetPlayerId: "opp1",
      targetTileIndex: 0,
    });
    expect(html).toContain("Targeting");
    expect(html).toContain("Opp1");
    expect(html).toContain("Confirm Grappling Hook");
  });
});
