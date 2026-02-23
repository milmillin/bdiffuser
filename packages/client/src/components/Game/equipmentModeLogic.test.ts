import { describe, expect, it } from "vitest";
import type { ClientPlayer, VisibleTile } from "@bomb-busters/shared";
import {
  getOpponentTileSelectableFilter,
  getOwnTileSelectableFilter,
  getOpponentSelectedTileIndex,
  getOpponentSelectedTileIndices,
  getOwnSelectedTileIndex,
  getOwnSelectedTileIndices,
  handleOpponentTileClick,
  handleOwnTileClickEquipment,
} from "./equipmentModeLogic.js";
import type { EquipmentMode } from "./Actions/EquipmentModePanel.js";

function tile(overrides: Partial<VisibleTile> = {}): VisibleTile {
  return { id: "t", cut: false, color: "blue", gameValue: 5, ...overrides };
}

function player(overrides: Partial<ClientPlayer> = {}): ClientPlayer {
  return {
    id: "me",
    name: "Me",
    character: null,
    isCaptain: false,
    hand: [tile()],
    infoTokens: [],
    characterUsed: false,
    connected: true,
    isBot: false,
    remainingTiles: 1,
    ...overrides,
  } as unknown as ClientPlayer;
}

// ---------------------------------------------------------------------------
// getOpponentTileSelectableFilter
// ---------------------------------------------------------------------------
describe("getOpponentTileSelectableFilter", () => {
  it("returns undefined when mode is null", () => {
    expect(getOpponentTileSelectableFilter(null, "opp1")).toBeUndefined();
  });

  it("double_detector: returns false for non-target opponent", () => {
    const mode: EquipmentMode = {
      kind: "double_detector",
      targetPlayerId: "opp1",
      selectedTiles: [0],
      guessTileIndex: null,
    };
    const filter = getOpponentTileSelectableFilter(mode, "opp2")!;
    expect(filter(tile(), 0)).toBe(false);
  });

  it("double_detector: returns true for uncut tiles on target opponent", () => {
    const mode: EquipmentMode = {
      kind: "double_detector",
      targetPlayerId: "opp1",
      selectedTiles: [0],
      guessTileIndex: null,
    };
    const filter = getOpponentTileSelectableFilter(mode, "opp1")!;
    expect(filter(tile(), 0)).toBe(true);
    expect(filter(tile({ cut: true }), 1)).toBe(false);
  });

  it("double_detector: allows any opponent when no target set yet", () => {
    const mode: EquipmentMode = {
      kind: "double_detector",
      targetPlayerId: null,
      selectedTiles: [],
      guessTileIndex: null,
    };
    const filter = getOpponentTileSelectableFilter(mode, "opp2")!;
    expect(filter(tile(), 0)).toBe(true);
  });

  it("talkies_walkies: returns true for uncut tiles on any opponent", () => {
    const mode: EquipmentMode = {
      kind: "talkies_walkies",
      teammateId: null,
      teammateTileIndex: null,
      myTileIndex: null,
    };
    const filter = getOpponentTileSelectableFilter(mode, "opp1")!;
    expect(filter(tile(), 0)).toBe(true);
    expect(filter(tile({ cut: true }), 1)).toBe(false);
  });

  it("triple_detector: locks to first selected opponent", () => {
    const mode: EquipmentMode = {
      kind: "triple_detector",
      targetPlayerId: "opp1",
      targetTileIndices: [0],
      guessTileIndex: null,
    };
    const filterTarget = getOpponentTileSelectableFilter(mode, "opp1")!;
    expect(filterTarget(tile(), 0)).toBe(true);
    const filterOther = getOpponentTileSelectableFilter(mode, "opp2")!;
    expect(filterOther(tile(), 0)).toBe(false);
  });

  it("triple_detector: allows any opponent when no target set", () => {
    const mode: EquipmentMode = {
      kind: "triple_detector",
      targetPlayerId: null,
      targetTileIndices: [],
      guessTileIndex: null,
    };
    const filter = getOpponentTileSelectableFilter(mode, "opp1")!;
    expect(filter(tile(), 0)).toBe(true);
  });

  it("super_detector: returns true for uncut tiles on any opponent", () => {
    const mode: EquipmentMode = {
      kind: "super_detector",
      targetPlayerId: null,
      guessTileIndex: null,
    };
    const filter = getOpponentTileSelectableFilter(mode, "opp1")!;
    expect(filter(tile(), 0)).toBe(true);
    expect(filter(tile({ cut: true }), 0)).toBe(false);
  });

  it("x_or_y_ray: returns true for uncut tiles on any opponent", () => {
    const mode: EquipmentMode = {
      kind: "x_or_y_ray",
      targetPlayerId: null,
      targetTileIndex: null,
      guessATileIndex: null,
      guessBTileIndex: null,
    };
    const filter = getOpponentTileSelectableFilter(mode, "opp1")!;
    expect(filter(tile(), 0)).toBe(true);
    expect(filter(tile({ cut: true }), 0)).toBe(false);
  });

  it("post_it: returns a function that always returns false", () => {
    const mode: EquipmentMode = { kind: "post_it" };
    const filter = getOpponentTileSelectableFilter(mode, "opp1")!;
    expect(filter(tile(), 0)).toBe(false);
  });

  it("general_radar: returns a function that always returns false", () => {
    const mode: EquipmentMode = { kind: "general_radar" };
    const filter = getOpponentTileSelectableFilter(mode, "opp1")!;
    expect(filter(tile(), 0)).toBe(false);
  });

  it("emergency_batteries: returns a function that always returns false", () => {
    const mode: EquipmentMode = {
      kind: "emergency_batteries",
      selectedPlayerIds: [],
    };
    const filter = getOpponentTileSelectableFilter(mode, "opp1")!;
    expect(filter(tile(), 0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getOwnTileSelectableFilter
// ---------------------------------------------------------------------------
describe("getOwnTileSelectableFilter", () => {
  it("returns undefined when mode is null", () => {
    expect(getOwnTileSelectableFilter(null, player())).toBeUndefined();
  });

  it("returns undefined when me is undefined", () => {
    const mode: EquipmentMode = { kind: "post_it" };
    expect(getOwnTileSelectableFilter(mode, undefined)).toBeUndefined();
  });

  it("post_it: allows uncut blue tiles without existing info token", () => {
    const me = player({
      hand: [tile({ gameValue: 3 }), tile({ color: "red", gameValue: "RED" }), tile({ gameValue: 7 })],
      infoTokens: [{ value: 3, position: 0, isYellow: false }],
    });
    const filter = getOwnTileSelectableFilter({ kind: "post_it" }, me)!;
    expect(filter(me.hand[0], 0)).toBe(false); // has info token at position 0
    expect(filter(me.hand[1], 1)).toBe(false); // red tile
    expect(filter(me.hand[2], 2)).toBe(true); // blue, no info token
  });

  it("post_it: rejects cut blue tiles", () => {
    const me = player({ hand: [tile({ cut: true, gameValue: 3 })] });
    const filter = getOwnTileSelectableFilter({ kind: "post_it" }, me)!;
    expect(filter(me.hand[0], 0)).toBe(false);
  });

  it("double_detector: returns false when fewer than 2 opponent tiles selected", () => {
    const mode: EquipmentMode = {
      kind: "double_detector",
      targetPlayerId: "opp1",
      selectedTiles: [0],
      guessTileIndex: null,
    };
    const filter = getOwnTileSelectableFilter(mode, player())!;
    expect(filter(tile(), 0)).toBe(false);
  });

  it("double_detector: allows uncut blue numeric tiles when 2 selected", () => {
    const mode: EquipmentMode = {
      kind: "double_detector",
      targetPlayerId: "opp1",
      selectedTiles: [0, 1],
      guessTileIndex: null,
    };
    const filter = getOwnTileSelectableFilter(mode, player())!;
    expect(filter(tile({ color: "blue", gameValue: 5 }), 0)).toBe(true);
    expect(filter(tile({ color: "red", gameValue: "RED" }), 1)).toBe(false);
    expect(filter(tile({ cut: true }), 2)).toBe(false);
  });

  it("label_eq step 1: allows all uncut tiles", () => {
    const mode: EquipmentMode = { kind: "label_eq", firstTileIndex: null };
    const filter = getOwnTileSelectableFilter(mode, player())!;
    expect(filter(tile(), 0)).toBe(true);
    expect(filter(tile({ color: "red", gameValue: "RED" }), 1)).toBe(true);
    expect(filter(tile({ cut: true }), 2)).toBe(false);
  });

  it("label_eq step 2: allows only adjacent tiles", () => {
    const mode: EquipmentMode = { kind: "label_eq", firstTileIndex: 2 };
    const filter = getOwnTileSelectableFilter(mode, player())!;
    expect(filter(tile(), 1)).toBe(true); // idx 1 is adjacent to 2
    expect(filter(tile(), 3)).toBe(true); // idx 3 is adjacent to 2
    expect(filter(tile(), 0)).toBe(false); // idx 0 is not adjacent
    expect(filter(tile(), 4)).toBe(false); // idx 4 is not adjacent
  });

  it("label_neq step 1: allows all uncut tiles", () => {
    const mode: EquipmentMode = { kind: "label_neq", firstTileIndex: null };
    const filter = getOwnTileSelectableFilter(mode, player())!;
    expect(filter(tile(), 0)).toBe(true);
    expect(filter(tile({ cut: true }), 0)).toBe(false);
  });

  it("label_neq step 2: allows only adjacent tiles", () => {
    const mode: EquipmentMode = { kind: "label_neq", firstTileIndex: 1 };
    const filter = getOwnTileSelectableFilter(mode, player())!;
    expect(filter(tile(), 0)).toBe(true);
    expect(filter(tile(), 2)).toBe(true);
    expect(filter(tile(), 3)).toBe(false);
  });

  it("talkies_walkies: returns false when no teammate selected", () => {
    const mode: EquipmentMode = {
      kind: "talkies_walkies",
      teammateId: null,
      teammateTileIndex: null,
      myTileIndex: null,
    };
    const filter = getOwnTileSelectableFilter(mode, player())!;
    expect(filter(tile(), 0)).toBe(false);
  });

  it("talkies_walkies: allows uncut tiles when teammate is set", () => {
    const mode: EquipmentMode = {
      kind: "talkies_walkies",
      teammateId: "opp1",
      teammateTileIndex: 0,
      myTileIndex: null,
    };
    const filter = getOwnTileSelectableFilter(mode, player())!;
    expect(filter(tile(), 0)).toBe(true);
    expect(filter(tile({ cut: true }), 0)).toBe(false);
  });

  it("triple_detector: returns false when fewer than 3 targets", () => {
    const mode: EquipmentMode = {
      kind: "triple_detector",
      targetPlayerId: "opp1",
      targetTileIndices: [0, 1],
      guessTileIndex: null,
    };
    const filter = getOwnTileSelectableFilter(mode, player())!;
    expect(filter(tile(), 0)).toBe(false);
  });

  it("triple_detector: allows uncut blue numeric tiles when 3 targets", () => {
    const mode: EquipmentMode = {
      kind: "triple_detector",
      targetPlayerId: "opp1",
      targetTileIndices: [0, 1, 2],
      guessTileIndex: null,
    };
    const filter = getOwnTileSelectableFilter(mode, player())!;
    expect(filter(tile({ color: "blue", gameValue: 5 }), 0)).toBe(true);
    expect(filter(tile({ color: "red", gameValue: "RED" }), 1)).toBe(false);
  });

  it("super_detector: returns false when no target", () => {
    const mode: EquipmentMode = {
      kind: "super_detector",
      targetPlayerId: null,
      guessTileIndex: null,
    };
    const filter = getOwnTileSelectableFilter(mode, player())!;
    expect(filter(tile(), 0)).toBe(false);
  });

  it("super_detector: allows uncut blue numeric tiles when target set", () => {
    const mode: EquipmentMode = {
      kind: "super_detector",
      targetPlayerId: "opp1",
      guessTileIndex: null,
    };
    const filter = getOwnTileSelectableFilter(mode, player())!;
    expect(filter(tile({ color: "blue", gameValue: 3 }), 0)).toBe(true);
    expect(filter(tile({ color: "yellow", gameValue: "YELLOW" }), 1)).toBe(false);
  });

  it("x_or_y_ray: returns false when no target/tile set", () => {
    const mode: EquipmentMode = {
      kind: "x_or_y_ray",
      targetPlayerId: null,
      targetTileIndex: null,
      guessATileIndex: null,
      guessBTileIndex: null,
    };
    const filter = getOwnTileSelectableFilter(mode, player())!;
    expect(filter(tile(), 0)).toBe(false);
  });

  it("x_or_y_ray: allows blue or yellow tiles for first guess", () => {
    const mode: EquipmentMode = {
      kind: "x_or_y_ray",
      targetPlayerId: "opp1",
      targetTileIndex: 0,
      guessATileIndex: null,
      guessBTileIndex: null,
    };
    const filter = getOwnTileSelectableFilter(mode, player())!;
    expect(filter(tile({ color: "blue", gameValue: 5 }), 0)).toBe(true);
    expect(filter(tile({ color: "yellow", gameValue: "YELLOW" }), 1)).toBe(true);
    expect(filter(tile({ color: "red", gameValue: "RED" }), 2)).toBe(false);
  });

  it("x_or_y_ray: allows tiles with different value for second guess", () => {
    const me = player({
      hand: [
        tile({ gameValue: 5 }),
        tile({ gameValue: 7 }),
        tile({ gameValue: 5 }),
        tile({ color: "yellow", gameValue: "YELLOW" }),
      ],
    });
    const mode: EquipmentMode = {
      kind: "x_or_y_ray",
      targetPlayerId: "opp1",
      targetTileIndex: 0,
      guessATileIndex: 0, // gameValue 5
      guessBTileIndex: null,
    };
    const filter = getOwnTileSelectableFilter(mode, me)!;
    expect(filter(me.hand[1], 1)).toBe(true); // gameValue 7 != 5
    expect(filter(me.hand[2], 2)).toBe(false); // gameValue 5 == 5
    expect(filter(me.hand[3], 3)).toBe(true); // yellow, value "YELLOW" != 5
  });

  it("x_or_y_ray: returns false when both guesses are set", () => {
    const mode: EquipmentMode = {
      kind: "x_or_y_ray",
      targetPlayerId: "opp1",
      targetTileIndex: 0,
      guessATileIndex: 0,
      guessBTileIndex: 1,
    };
    const filter = getOwnTileSelectableFilter(mode, player())!;
    expect(filter(tile(), 0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// highlight functions
// ---------------------------------------------------------------------------
describe("highlight functions", () => {
  describe("getOpponentSelectedTileIndex", () => {
    it("returns undefined when mode is null", () => {
      expect(getOpponentSelectedTileIndex(null, "opp1")).toBeUndefined();
    });

    it("x_or_y_ray: returns target tile index for target opponent", () => {
      const mode: EquipmentMode = {
        kind: "x_or_y_ray",
        targetPlayerId: "opp1",
        targetTileIndex: 2,
        guessATileIndex: null,
        guessBTileIndex: null,
      };
      expect(getOpponentSelectedTileIndex(mode, "opp1")).toBe(2);
    });

    it("x_or_y_ray: returns undefined for non-target opponent", () => {
      const mode: EquipmentMode = {
        kind: "x_or_y_ray",
        targetPlayerId: "opp1",
        targetTileIndex: 2,
        guessATileIndex: null,
        guessBTileIndex: null,
      };
      expect(getOpponentSelectedTileIndex(mode, "opp2")).toBeUndefined();
    });

    it("x_or_y_ray: returns undefined when targetTileIndex is null", () => {
      const mode: EquipmentMode = {
        kind: "x_or_y_ray",
        targetPlayerId: "opp1",
        targetTileIndex: null,
        guessATileIndex: null,
        guessBTileIndex: null,
      };
      expect(getOpponentSelectedTileIndex(mode, "opp1")).toBeUndefined();
    });

    it("talkies_walkies: returns teammate tile index for teammate", () => {
      const mode: EquipmentMode = {
        kind: "talkies_walkies",
        teammateId: "opp1",
        teammateTileIndex: 3,
        myTileIndex: null,
      };
      expect(getOpponentSelectedTileIndex(mode, "opp1")).toBe(3);
    });

    it("talkies_walkies: returns undefined for non-teammate", () => {
      const mode: EquipmentMode = {
        kind: "talkies_walkies",
        teammateId: "opp1",
        teammateTileIndex: 3,
        myTileIndex: null,
      };
      expect(getOpponentSelectedTileIndex(mode, "opp2")).toBeUndefined();
    });

    it("double_detector: returns undefined (uses indices not index)", () => {
      const mode: EquipmentMode = {
        kind: "double_detector",
        targetPlayerId: "opp1",
        selectedTiles: [0, 1],
        guessTileIndex: null,
      };
      expect(getOpponentSelectedTileIndex(mode, "opp1")).toBeUndefined();
    });
  });

  describe("getOpponentSelectedTileIndices", () => {
    it("returns undefined when mode is null", () => {
      expect(getOpponentSelectedTileIndices(null, "opp1")).toBeUndefined();
    });

    it("double_detector: returns selected tiles for target opponent", () => {
      const mode: EquipmentMode = {
        kind: "double_detector",
        targetPlayerId: "opp1",
        selectedTiles: [0, 3],
        guessTileIndex: null,
      };
      expect(getOpponentSelectedTileIndices(mode, "opp1")).toEqual([0, 3]);
    });

    it("double_detector: returns undefined for non-target opponent", () => {
      const mode: EquipmentMode = {
        kind: "double_detector",
        targetPlayerId: "opp1",
        selectedTiles: [0, 3],
        guessTileIndex: null,
      };
      expect(getOpponentSelectedTileIndices(mode, "opp2")).toBeUndefined();
    });

    it("triple_detector: returns target tile indices for target opponent", () => {
      const mode: EquipmentMode = {
        kind: "triple_detector",
        targetPlayerId: "opp1",
        targetTileIndices: [0, 2, 4],
        guessTileIndex: null,
      };
      expect(getOpponentSelectedTileIndices(mode, "opp1")).toEqual([0, 2, 4]);
    });

    it("triple_detector: returns undefined for non-target opponent", () => {
      const mode: EquipmentMode = {
        kind: "triple_detector",
        targetPlayerId: "opp1",
        targetTileIndices: [0, 2, 4],
        guessTileIndex: null,
      };
      expect(getOpponentSelectedTileIndices(mode, "opp2")).toBeUndefined();
    });
  });

  describe("getOwnSelectedTileIndex", () => {
    it("returns undefined when mode is null", () => {
      expect(getOwnSelectedTileIndex(null)).toBeUndefined();
    });

    it("double_detector: returns guessTileIndex", () => {
      const mode: EquipmentMode = {
        kind: "double_detector",
        targetPlayerId: "opp1",
        selectedTiles: [0, 1],
        guessTileIndex: 2,
      };
      expect(getOwnSelectedTileIndex(mode)).toBe(2);
    });

    it("double_detector: returns undefined when guessTileIndex is null", () => {
      const mode: EquipmentMode = {
        kind: "double_detector",
        targetPlayerId: "opp1",
        selectedTiles: [0, 1],
        guessTileIndex: null,
      };
      expect(getOwnSelectedTileIndex(mode)).toBeUndefined();
    });

    it("label_eq: returns firstTileIndex", () => {
      const mode: EquipmentMode = { kind: "label_eq", firstTileIndex: 1 };
      expect(getOwnSelectedTileIndex(mode)).toBe(1);
    });

    it("label_neq: returns firstTileIndex", () => {
      const mode: EquipmentMode = { kind: "label_neq", firstTileIndex: 3 };
      expect(getOwnSelectedTileIndex(mode)).toBe(3);
    });

    it("talkies_walkies: returns myTileIndex", () => {
      const mode: EquipmentMode = {
        kind: "talkies_walkies",
        teammateId: "opp1",
        teammateTileIndex: 0,
        myTileIndex: 2,
      };
      expect(getOwnSelectedTileIndex(mode)).toBe(2);
    });

    it("triple_detector: returns guessTileIndex", () => {
      const mode: EquipmentMode = {
        kind: "triple_detector",
        targetPlayerId: "opp1",
        targetTileIndices: [0, 1, 2],
        guessTileIndex: 4,
      };
      expect(getOwnSelectedTileIndex(mode)).toBe(4);
    });

    it("super_detector: returns guessTileIndex", () => {
      const mode: EquipmentMode = {
        kind: "super_detector",
        targetPlayerId: "opp1",
        guessTileIndex: 1,
      };
      expect(getOwnSelectedTileIndex(mode)).toBe(1);
    });

    it("post_it: returns undefined (no own selection highlight)", () => {
      expect(getOwnSelectedTileIndex({ kind: "post_it" })).toBeUndefined();
    });
  });

  describe("getOwnSelectedTileIndices", () => {
    it("returns undefined when mode is null", () => {
      expect(getOwnSelectedTileIndices(null)).toBeUndefined();
    });

    it("x_or_y_ray: returns both guess indices when set", () => {
      const mode: EquipmentMode = {
        kind: "x_or_y_ray",
        targetPlayerId: "opp1",
        targetTileIndex: 0,
        guessATileIndex: 1,
        guessBTileIndex: 3,
      };
      expect(getOwnSelectedTileIndices(mode)).toEqual([1, 3]);
    });

    it("x_or_y_ray: returns only guessA when guessB is null", () => {
      const mode: EquipmentMode = {
        kind: "x_or_y_ray",
        targetPlayerId: "opp1",
        targetTileIndex: 0,
        guessATileIndex: 1,
        guessBTileIndex: null,
      };
      expect(getOwnSelectedTileIndices(mode)).toEqual([1]);
    });

    it("x_or_y_ray: returns undefined when no guesses set", () => {
      const mode: EquipmentMode = {
        kind: "x_or_y_ray",
        targetPlayerId: "opp1",
        targetTileIndex: 0,
        guessATileIndex: null,
        guessBTileIndex: null,
      };
      expect(getOwnSelectedTileIndices(mode)).toBeUndefined();
    });

    it("double_detector: returns undefined (uses single index)", () => {
      const mode: EquipmentMode = {
        kind: "double_detector",
        targetPlayerId: "opp1",
        selectedTiles: [0, 1],
        guessTileIndex: 2,
      };
      expect(getOwnSelectedTileIndices(mode)).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// handleOpponentTileClick
// ---------------------------------------------------------------------------
describe("handleOpponentTileClick", () => {
  it("returns null when mode is null", () => {
    expect(handleOpponentTileClick(null, "opp1", 0)).toBeNull();
  });

  it("double_detector: selects a tile on an opponent", () => {
    const mode: EquipmentMode = {
      kind: "double_detector",
      targetPlayerId: null,
      selectedTiles: [],
      guessTileIndex: null,
    };
    const result = handleOpponentTileClick(mode, "opp1", 2) as Extract<EquipmentMode, { kind: "double_detector" }>;
    expect(result.targetPlayerId).toBe("opp1");
    expect(result.selectedTiles).toEqual([2]);
  });

  it("double_detector: deselects an already selected tile", () => {
    const mode: EquipmentMode = {
      kind: "double_detector",
      targetPlayerId: "opp1",
      selectedTiles: [2, 3],
      guessTileIndex: 0,
    };
    const result = handleOpponentTileClick(mode, "opp1", 2) as Extract<EquipmentMode, { kind: "double_detector" }>;
    expect(result.selectedTiles).toEqual([3]);
    expect(result.guessTileIndex).toBeNull(); // cleared because < 2 tiles
  });

  it("double_detector: caps at 2 tiles", () => {
    const mode: EquipmentMode = {
      kind: "double_detector",
      targetPlayerId: "opp1",
      selectedTiles: [0, 1],
      guessTileIndex: null,
    };
    const result = handleOpponentTileClick(mode, "opp1", 3) as Extract<EquipmentMode, { kind: "double_detector" }>;
    expect(result.selectedTiles).toEqual([0, 1]); // unchanged, already at cap
  });

  it("double_detector: locks to one opponent, ignores clicks on different opponent", () => {
    const mode: EquipmentMode = {
      kind: "double_detector",
      targetPlayerId: "opp1",
      selectedTiles: [0],
      guessTileIndex: null,
    };
    const result = handleOpponentTileClick(mode, "opp2", 1);
    expect(result).toEqual(mode); // returned unchanged
  });

  it("double_detector: clears targetPlayerId when all tiles deselected", () => {
    const mode: EquipmentMode = {
      kind: "double_detector",
      targetPlayerId: "opp1",
      selectedTiles: [2],
      guessTileIndex: null,
    };
    const result = handleOpponentTileClick(mode, "opp1", 2) as Extract<EquipmentMode, { kind: "double_detector" }>;
    expect(result.selectedTiles).toEqual([]);
    expect(result.targetPlayerId).toBeNull();
  });

  it("talkies_walkies: sets teammate and clears myTileIndex", () => {
    const mode: EquipmentMode = {
      kind: "talkies_walkies",
      teammateId: "opp1",
      teammateTileIndex: 0,
      myTileIndex: 2,
    };
    const result = handleOpponentTileClick(mode, "opp2", 3) as Extract<EquipmentMode, { kind: "talkies_walkies" }>;
    expect(result.teammateId).toBe("opp2");
    expect(result.teammateTileIndex).toBe(3);
    expect(result.myTileIndex).toBeNull();
  });

  it("triple_detector: toggles tile selection", () => {
    const mode: EquipmentMode = {
      kind: "triple_detector",
      targetPlayerId: null,
      targetTileIndices: [],
      guessTileIndex: null,
    };
    const r1 = handleOpponentTileClick(mode, "opp1", 0) as Extract<EquipmentMode, { kind: "triple_detector" }>;
    expect(r1.targetTileIndices).toEqual([0]);
    expect(r1.targetPlayerId).toBe("opp1");

    const r2 = handleOpponentTileClick(r1, "opp1", 2) as Extract<EquipmentMode, { kind: "triple_detector" }>;
    expect(r2.targetTileIndices).toEqual([0, 2]);

    // Deselect
    const r3 = handleOpponentTileClick(r2, "opp1", 0) as Extract<EquipmentMode, { kind: "triple_detector" }>;
    expect(r3.targetTileIndices).toEqual([2]);
  });

  it("triple_detector: caps at 3 tiles", () => {
    const mode: EquipmentMode = {
      kind: "triple_detector",
      targetPlayerId: "opp1",
      targetTileIndices: [0, 1, 2],
      guessTileIndex: null,
    };
    const result = handleOpponentTileClick(mode, "opp1", 4) as Extract<EquipmentMode, { kind: "triple_detector" }>;
    expect(result.targetTileIndices).toEqual([0, 1, 2]); // unchanged
  });

  it("triple_detector: locks to one opponent", () => {
    const mode: EquipmentMode = {
      kind: "triple_detector",
      targetPlayerId: "opp1",
      targetTileIndices: [0],
      guessTileIndex: null,
    };
    const result = handleOpponentTileClick(mode, "opp2", 1);
    expect(result).toEqual(mode);
  });

  it("triple_detector: clears guessTileIndex when tiles drop below 3", () => {
    const mode: EquipmentMode = {
      kind: "triple_detector",
      targetPlayerId: "opp1",
      targetTileIndices: [0, 1, 2],
      guessTileIndex: 5,
    };
    const result = handleOpponentTileClick(mode, "opp1", 1) as Extract<EquipmentMode, { kind: "triple_detector" }>;
    expect(result.targetTileIndices).toEqual([0, 2]);
    expect(result.guessTileIndex).toBeNull();
  });

  it("super_detector: sets targetPlayerId", () => {
    const mode: EquipmentMode = {
      kind: "super_detector",
      targetPlayerId: null,
      guessTileIndex: null,
    };
    const result = handleOpponentTileClick(mode, "opp1", 0) as Extract<EquipmentMode, { kind: "super_detector" }>;
    expect(result.targetPlayerId).toBe("opp1");
  });

  it("super_detector: clears guess on target switch", () => {
    const mode: EquipmentMode = {
      kind: "super_detector",
      targetPlayerId: "opp1",
      guessTileIndex: 3,
    };
    const result = handleOpponentTileClick(mode, "opp2", 0) as Extract<EquipmentMode, { kind: "super_detector" }>;
    expect(result.targetPlayerId).toBe("opp2");
    expect(result.guessTileIndex).toBeNull();
  });

  it("super_detector: preserves guess when clicking same opponent", () => {
    const mode: EquipmentMode = {
      kind: "super_detector",
      targetPlayerId: "opp1",
      guessTileIndex: 3,
    };
    const result = handleOpponentTileClick(mode, "opp1", 1) as Extract<EquipmentMode, { kind: "super_detector" }>;
    expect(result.targetPlayerId).toBe("opp1");
    expect(result.guessTileIndex).toBe(3);
  });

  it("x_or_y_ray: sets target and clears guesses on change", () => {
    const mode: EquipmentMode = {
      kind: "x_or_y_ray",
      targetPlayerId: "opp1",
      targetTileIndex: 0,
      guessATileIndex: 1,
      guessBTileIndex: 2,
    };
    const result = handleOpponentTileClick(mode, "opp2", 3) as Extract<EquipmentMode, { kind: "x_or_y_ray" }>;
    expect(result.targetPlayerId).toBe("opp2");
    expect(result.targetTileIndex).toBe(3);
    expect(result.guessATileIndex).toBeNull();
    expect(result.guessBTileIndex).toBeNull();
  });

  it("x_or_y_ray: preserves guesses when clicking same tile on same opponent", () => {
    const mode: EquipmentMode = {
      kind: "x_or_y_ray",
      targetPlayerId: "opp1",
      targetTileIndex: 2,
      guessATileIndex: 1,
      guessBTileIndex: 3,
    };
    const result = handleOpponentTileClick(mode, "opp1", 2) as Extract<EquipmentMode, { kind: "x_or_y_ray" }>;
    expect(result.guessATileIndex).toBe(1);
    expect(result.guessBTileIndex).toBe(3);
  });

  it("post_it: returns mode unchanged", () => {
    const mode: EquipmentMode = { kind: "post_it" };
    expect(handleOpponentTileClick(mode, "opp1", 0)).toEqual(mode);
  });
});

// ---------------------------------------------------------------------------
// handleOwnTileClickEquipment
// ---------------------------------------------------------------------------
describe("handleOwnTileClickEquipment", () => {
  it("returns original mode when mode is null", () => {
    const result = handleOwnTileClickEquipment(null, 0, player());
    expect(result.newMode).toBeNull();
    expect(result.sendPayload).toBeUndefined();
  });

  it("returns original mode when me is undefined", () => {
    const mode: EquipmentMode = { kind: "post_it" };
    const result = handleOwnTileClickEquipment(mode, 0, undefined);
    expect(result.newMode).toEqual(mode);
  });

  it("returns original mode when tile is cut", () => {
    const me = player({ hand: [tile({ cut: true })] });
    const mode: EquipmentMode = { kind: "post_it" };
    const result = handleOwnTileClickEquipment(mode, 0, me);
    expect(result.newMode).toEqual(mode);
  });

  it("post_it: sends useEquipment for valid blue tile", () => {
    const me = player({ hand: [tile({ color: "blue", gameValue: 3 })] });
    const result = handleOwnTileClickEquipment({ kind: "post_it" }, 0, me);
    expect(result.newMode).toBeNull();
    expect(result.sendPayload).toEqual({
      type: "useEquipment",
      equipmentId: "post_it",
      payload: { kind: "post_it", tileIndex: 0 },
    });
  });

  it("post_it: ignores red tile", () => {
    const me = player({ hand: [tile({ color: "red", gameValue: "RED" })] });
    const result = handleOwnTileClickEquipment({ kind: "post_it" }, 0, me);
    expect(result.sendPayload).toBeUndefined();
  });

  it("post_it: ignores tile with existing info token", () => {
    const me = player({
      hand: [tile({ color: "blue", gameValue: 3 })],
      infoTokens: [{ value: 3, position: 0, isYellow: false }],
    });
    const result = handleOwnTileClickEquipment({ kind: "post_it" }, 0, me);
    expect(result.sendPayload).toBeUndefined();
  });

  it("label_eq step 1: sets firstTileIndex", () => {
    const me = player({ hand: [tile(), tile()] });
    const mode: EquipmentMode = { kind: "label_eq", firstTileIndex: null };
    const result = handleOwnTileClickEquipment(mode, 0, me);
    expect(result.newMode).toEqual({ kind: "label_eq", firstTileIndex: 0 });
    expect(result.sendPayload).toBeUndefined();
  });

  it("label_eq step 2: sends useEquipment when adjacent tile clicked", () => {
    const me = player({ hand: [tile(), tile(), tile()] });
    const mode: EquipmentMode = { kind: "label_eq", firstTileIndex: 1 };
    const result = handleOwnTileClickEquipment(mode, 2, me);
    expect(result.newMode).toBeNull();
    expect(result.sendPayload).toEqual({
      type: "useEquipment",
      equipmentId: "label_eq",
      payload: { kind: "label_eq", tileIndexA: 1, tileIndexB: 2 },
    });
  });

  it("label_eq step 2: ignores non-adjacent tile", () => {
    const me = player({ hand: [tile(), tile(), tile(), tile()] });
    const mode: EquipmentMode = { kind: "label_eq", firstTileIndex: 0 };
    const result = handleOwnTileClickEquipment(mode, 3, me);
    expect(result.newMode).toEqual(mode);
    expect(result.sendPayload).toBeUndefined();
  });

  it("label_neq step 1: sets firstTileIndex", () => {
    const me = player({ hand: [tile(), tile()] });
    const mode: EquipmentMode = { kind: "label_neq", firstTileIndex: null };
    const result = handleOwnTileClickEquipment(mode, 1, me);
    expect(result.newMode).toEqual({ kind: "label_neq", firstTileIndex: 1 });
  });

  it("label_neq step 2: sends useEquipment for adjacent tile", () => {
    const me = player({ hand: [tile(), tile(), tile()] });
    const mode: EquipmentMode = { kind: "label_neq", firstTileIndex: 0 };
    const result = handleOwnTileClickEquipment(mode, 1, me);
    expect(result.newMode).toBeNull();
    expect(result.sendPayload).toEqual({
      type: "useEquipment",
      equipmentId: "label_neq",
      payload: { kind: "label_neq", tileIndexA: 0, tileIndexB: 1 },
    });
  });

  it("talkies_walkies: sends when teammate is selected", () => {
    const me = player({ hand: [tile()] });
    const mode: EquipmentMode = {
      kind: "talkies_walkies",
      teammateId: "opp1",
      teammateTileIndex: 2,
      myTileIndex: null,
    };
    const result = handleOwnTileClickEquipment(mode, 0, me);
    expect(result.newMode).toBeNull();
    expect(result.sendPayload).toEqual({
      type: "useEquipment",
      equipmentId: "talkies_walkies",
      payload: {
        kind: "talkies_walkies",
        teammateId: "opp1",
        myTileIndex: 0,
        teammateTileIndex: 2,
      },
    });
  });

  it("talkies_walkies: ignores when no teammate selected", () => {
    const me = player({ hand: [tile()] });
    const mode: EquipmentMode = {
      kind: "talkies_walkies",
      teammateId: null,
      teammateTileIndex: null,
      myTileIndex: null,
    };
    const result = handleOwnTileClickEquipment(mode, 0, me);
    expect(result.newMode).toEqual(mode);
    expect(result.sendPayload).toBeUndefined();
  });

  it("double_detector: sets guessTileIndex when 2 tiles selected", () => {
    const me = player({ hand: [tile({ gameValue: 3 })] });
    const mode: EquipmentMode = {
      kind: "double_detector",
      targetPlayerId: "opp1",
      selectedTiles: [0, 1],
      guessTileIndex: null,
    };
    const result = handleOwnTileClickEquipment(mode, 0, me);
    expect(result.newMode).toEqual({ ...mode, guessTileIndex: 0 });
    expect(result.sendPayload).toBeUndefined();
  });

  it("double_detector: ignores when fewer than 2 opponent tiles", () => {
    const me = player({ hand: [tile()] });
    const mode: EquipmentMode = {
      kind: "double_detector",
      targetPlayerId: "opp1",
      selectedTiles: [0],
      guessTileIndex: null,
    };
    const result = handleOwnTileClickEquipment(mode, 0, me);
    expect(result.newMode).toEqual(mode);
  });

  it("double_detector: ignores red tiles for guess", () => {
    const me = player({ hand: [tile({ color: "red", gameValue: "RED" })] });
    const mode: EquipmentMode = {
      kind: "double_detector",
      targetPlayerId: "opp1",
      selectedTiles: [0, 1],
      guessTileIndex: null,
    };
    const result = handleOwnTileClickEquipment(mode, 0, me);
    expect(result.newMode).toEqual(mode);
  });

  it("triple_detector: sets guessTileIndex for blue numeric tile when 3 targets", () => {
    const me = player({ hand: [tile({ color: "blue", gameValue: 7 })] });
    const mode: EquipmentMode = {
      kind: "triple_detector",
      targetPlayerId: "opp1",
      targetTileIndices: [0, 1, 2],
      guessTileIndex: null,
    };
    const result = handleOwnTileClickEquipment(mode, 0, me);
    expect(result.newMode).toEqual({ ...mode, guessTileIndex: 0 });
  });

  it("triple_detector: ignores when fewer than 3 targets", () => {
    const me = player({ hand: [tile()] });
    const mode: EquipmentMode = {
      kind: "triple_detector",
      targetPlayerId: "opp1",
      targetTileIndices: [0, 1],
      guessTileIndex: null,
    };
    const result = handleOwnTileClickEquipment(mode, 0, me);
    expect(result.newMode).toEqual(mode);
  });

  it("triple_detector: ignores non-blue tiles", () => {
    const me = player({ hand: [tile({ color: "red", gameValue: "RED" })] });
    const mode: EquipmentMode = {
      kind: "triple_detector",
      targetPlayerId: "opp1",
      targetTileIndices: [0, 1, 2],
      guessTileIndex: null,
    };
    const result = handleOwnTileClickEquipment(mode, 0, me);
    expect(result.newMode).toEqual(mode);
  });

  it("super_detector: sets guessTileIndex for blue numeric tile", () => {
    const me = player({ hand: [tile({ color: "blue", gameValue: 4 })] });
    const mode: EquipmentMode = {
      kind: "super_detector",
      targetPlayerId: "opp1",
      guessTileIndex: null,
    };
    const result = handleOwnTileClickEquipment(mode, 0, me);
    expect(result.newMode).toEqual({ ...mode, guessTileIndex: 0 });
  });

  it("super_detector: ignores when no target set", () => {
    const me = player({ hand: [tile()] });
    const mode: EquipmentMode = {
      kind: "super_detector",
      targetPlayerId: null,
      guessTileIndex: null,
    };
    const result = handleOwnTileClickEquipment(mode, 0, me);
    expect(result.newMode).toEqual(mode);
  });

  it("x_or_y_ray: sets guessATileIndex first", () => {
    const me = player({
      hand: [tile({ color: "blue", gameValue: 5 }), tile({ color: "blue", gameValue: 7 })],
    });
    const mode: EquipmentMode = {
      kind: "x_or_y_ray",
      targetPlayerId: "opp1",
      targetTileIndex: 0,
      guessATileIndex: null,
      guessBTileIndex: null,
    };
    const result = handleOwnTileClickEquipment(mode, 0, me);
    expect(result.newMode).toEqual({ ...mode, guessATileIndex: 0 });
    expect(result.sendPayload).toBeUndefined();
  });

  it("x_or_y_ray: sets guessBTileIndex with different value", () => {
    const me = player({
      hand: [tile({ color: "blue", gameValue: 5 }), tile({ color: "blue", gameValue: 7 })],
    });
    const mode: EquipmentMode = {
      kind: "x_or_y_ray",
      targetPlayerId: "opp1",
      targetTileIndex: 0,
      guessATileIndex: 0, // value 5
      guessBTileIndex: null,
    };
    const result = handleOwnTileClickEquipment(mode, 1, me);
    expect(result.newMode).toEqual({ ...mode, guessBTileIndex: 1 });
  });

  it("x_or_y_ray: rejects guessBTileIndex with same value as guessA", () => {
    const me = player({
      hand: [tile({ color: "blue", gameValue: 5 }), tile({ color: "blue", gameValue: 5 })],
    });
    const mode: EquipmentMode = {
      kind: "x_or_y_ray",
      targetPlayerId: "opp1",
      targetTileIndex: 0,
      guessATileIndex: 0,
      guessBTileIndex: null,
    };
    const result = handleOwnTileClickEquipment(mode, 1, me);
    expect(result.newMode).toEqual(mode); // unchanged
  });

  it("x_or_y_ray: ignores when no target set", () => {
    const me = player({ hand: [tile()] });
    const mode: EquipmentMode = {
      kind: "x_or_y_ray",
      targetPlayerId: null,
      targetTileIndex: null,
      guessATileIndex: null,
      guessBTileIndex: null,
    };
    const result = handleOwnTileClickEquipment(mode, 0, me);
    expect(result.newMode).toEqual(mode);
  });

  it("x_or_y_ray: ignores red tiles", () => {
    const me = player({ hand: [tile({ color: "red", gameValue: "RED" })] });
    const mode: EquipmentMode = {
      kind: "x_or_y_ray",
      targetPlayerId: "opp1",
      targetTileIndex: 0,
      guessATileIndex: null,
      guessBTileIndex: null,
    };
    const result = handleOwnTileClickEquipment(mode, 0, me);
    expect(result.newMode).toEqual(mode);
  });

  it("x_or_y_ray: returns unchanged when both guesses already set", () => {
    const me = player({
      hand: [
        tile({ color: "blue", gameValue: 5 }),
        tile({ color: "blue", gameValue: 7 }),
        tile({ color: "blue", gameValue: 9 }),
      ],
    });
    const mode: EquipmentMode = {
      kind: "x_or_y_ray",
      targetPlayerId: "opp1",
      targetTileIndex: 0,
      guessATileIndex: 0,
      guessBTileIndex: 1,
    };
    const result = handleOwnTileClickEquipment(mode, 2, me);
    expect(result.newMode).toEqual(mode);
  });
});
