import type {
  WireTile,
  Player,
  BoardState,
  GameState,
  EquipmentCard,
  InfoToken,
  NumberCard,
  NumberCardState,
  ConstraintCard,
  ConstraintCardState,
  ChallengeCard,
  ChallengeCardState,
  OxygenState,
  ProgressTracker,
  SpecialMarker,
  CampaignState,
} from "../types.js";
import {
  emptyNumberCardState,
  emptyConstraintCardState,
  emptyChallengeCardState,
  defaultOxygenState,
  defaultProgressTracker,
} from "../types.js";

// ── Wire Tiles ─────────────────────────────────────────────

export function makeTile(overrides: Partial<WireTile> = {}): WireTile {
  return {
    id: "tile-1",
    color: "blue",
    sortValue: 1,
    gameValue: 1,
    image: "tile.png",
    cut: false,
    ...overrides,
  };
}

export function makeRedTile(overrides: Partial<WireTile> = {}): WireTile {
  return makeTile({
    id: "red-1",
    color: "red",
    sortValue: 3.5,
    gameValue: "RED",
    image: "red.png",
    ...overrides,
  });
}

export function makeYellowTile(overrides: Partial<WireTile> = {}): WireTile {
  return makeTile({
    id: "yellow-1",
    color: "yellow",
    sortValue: 5.1,
    gameValue: "YELLOW",
    image: "yellow.png",
    ...overrides,
  });
}

// ── Info Tokens ────────────────────────────────────────────

export function makeInfoToken(overrides: Partial<InfoToken> = {}): InfoToken {
  return {
    value: 1,
    position: 0,
    isYellow: false,
    ...overrides,
  };
}

// ── Equipment ──────────────────────────────────────────────

export function makeEquipmentCard(
  overrides: Partial<EquipmentCard> = {},
): EquipmentCard {
  return {
    id: "equip-1",
    name: "Test Equipment",
    description: "A test equipment card",
    unlockValue: 1,
    unlocked: false,
    used: false,
    image: "equip.png",
    ...overrides,
  };
}

// ── Players ────────────────────────────────────────────────

export function makePlayer(overrides: Partial<Player> = {}): Player {
  const {
    hand: overrideHand,
    standSizes: overrideStandSizes,
    ...restOverrides
  } = overrides;
  const hand = overrideHand ?? [makeTile()];
  const standSizes = overrideStandSizes ?? [hand.length > 0 ? hand.length : 0];

  return {
    id: "player-1",
    name: "Alice",
    character: null,
    isCaptain: false,
    hand,
    standSizes,
    infoTokens: [],
    characterUsed: false,
    connected: true,
    isBot: false,
    ...restOverrides,
  };
}

// ── Board State ────────────────────────────────────────────

export function makeBoardState(
  overrides: Partial<BoardState> = {},
): BoardState {
  return {
    detonatorPosition: 0,
    detonatorMax: 3,
    validationTrack: {},
    markers: [],
    equipment: [],
    ...overrides,
  };
}

// ── Game State ─────────────────────────────────────────────

export function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: "playing",
    roomId: "room-1",
    players: [makePlayer()],
    board: makeBoardState(),
    currentPlayerIndex: 0,
    turnNumber: 1,
    mission: 1,
    result: null,
    log: [],
    chat: [],
    ...overrides,
  };
}

// ── Campaign Object Builders ──────────────────────────────

export function makeNumberCard(overrides: Partial<NumberCard> = {}): NumberCard {
  return { id: "num-1", value: 1, faceUp: false, ...overrides };
}

export function makeNumberCardState(
  overrides: Partial<NumberCardState> = {},
): NumberCardState {
  return { ...emptyNumberCardState(), ...overrides };
}

export function makeConstraintCard(
  overrides: Partial<ConstraintCard> = {},
): ConstraintCard {
  return {
    id: "constraint-1",
    name: "Test Constraint",
    description: "A test constraint",
    active: true,
    ...overrides,
  };
}

export function makeConstraintCardState(
  overrides: Partial<ConstraintCardState> = {},
): ConstraintCardState {
  return { ...emptyConstraintCardState(), ...overrides };
}

export function makeChallengeCard(
  overrides: Partial<ChallengeCard> = {},
): ChallengeCard {
  return {
    id: "challenge-1",
    name: "Test Challenge",
    description: "A test challenge",
    completed: false,
    ...overrides,
  };
}

export function makeChallengeCardState(
  overrides: Partial<ChallengeCardState> = {},
): ChallengeCardState {
  return { ...emptyChallengeCardState(), ...overrides };
}

export function makeOxygenState(
  overrides: Partial<OxygenState> = {},
): OxygenState {
  return { ...defaultOxygenState(), ...overrides };
}

export function makeProgressTracker(
  overrides: Partial<ProgressTracker> = {},
): ProgressTracker {
  return { ...defaultProgressTracker(10), ...overrides };
}

export function makeSpecialMarker(
  overrides: Partial<SpecialMarker> = {},
): SpecialMarker {
  return { kind: "x", value: 0, ...overrides };
}

export function makeCampaignState(
  overrides: Partial<CampaignState> = {},
): CampaignState {
  return { ...overrides };
}
