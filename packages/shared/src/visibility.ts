import type {
  CampaignState,
  NumberCard,
  NumberCardState,
  ChallengeCard,
  ChallengeCardState,
} from "./types.js";

// ── Visibility Levels ──────────────────────────────────────

/**
 * Visibility levels for campaign state fields sent to clients.
 *
 * - "public"     – Full data sent to all players.
 * - "owner_only" – Full data to the owning player; redacted for others.
 *                  For per-player maps, each player sees their own entries
 *                  fully but other players' entries have secret values stripped.
 * - "hidden"     – Content redacted for ALL clients. Array length is preserved
 *                  so the client can display deck/pile counts.
 */
export type VisibilityLevel = "public" | "owner_only" | "hidden";

// ── Per-Object Visibility Rules ────────────────────────────

export interface NumberCardVisibility {
  /** Draw pile: hidden from all clients (card count preserved). */
  deck: "hidden";
  /** Discard pile: visible to all players. */
  discard: "public";
  /** Shared visible display cards: visible to all players. */
  visible: "public";
  /** Per-player hands: owner sees full cards; others' face-down cards are redacted. */
  playerHands: "owner_only";
}

export interface ConstraintVisibility {
  /** Global constraints: visible to all (everyone must know active rules). */
  global: "public";
  /** Per-player constraints: visible to all (coordination requires knowing all constraints). */
  perPlayer: "public";
}

export interface ChallengeVisibility {
  /** Undrawn challenge deck: hidden from all clients (card count preserved). */
  deck: "hidden";
  /** Active challenges: visible to all players. */
  active: "public";
  /** Completed/discarded challenges: visible to all players. */
  completed: "public";
}

export interface OxygenVisibility {
  /** Shared oxygen pool: visible to all players. */
  pool: "public";
  /** Per-player oxygen holdings: visible to all players. */
  playerOxygen: "public";
}

// ── Aggregate Visibility Model ─────────────────────────────

/**
 * Authoritative visibility model for all campaign state objects.
 * The server view filter uses this to determine what data each client receives.
 *
 * Top-level sub-objects (numberCards, constraints, etc.) are present only when
 * the active mission uses that mechanic — their presence/absence is always public.
 */
export interface CampaignVisibilityModel {
  numberCards: NumberCardVisibility;
  constraints: ConstraintVisibility;
  challenges: ChallengeVisibility;
  oxygen: OxygenVisibility;
  /** Nano progress tracker: visible to all (board-level shared tracker). */
  nanoTracker: "public";
  /** Bunker progress tracker: visible to all (board-level shared tracker). */
  bunkerTracker: "public";
  /** Special markers (X, sequence/action pointers): visible to all (board-level). */
  specialMarkers: "public";
  /** Mission 22 token-pass board supply: visible to all players. */
  mission22TokenPassBoard: "public";
  /** Mission 17 captain false setup token mode: visible to all players. */
  falseInfoTokenMode: "public";
  /** Mission 52 all-false setup token mode: visible to all players. */
  falseTokenMode: "public";
}

/**
 * Canonical visibility rules for campaign objects.
 * Single source of truth referenced by the server view filter.
 */
export const CAMPAIGN_VISIBILITY: CampaignVisibilityModel = {
  numberCards: {
    deck: "hidden",
    discard: "public",
    visible: "public",
    playerHands: "owner_only",
  },
  constraints: {
    global: "public",
    perPlayer: "public",
  },
  challenges: {
    deck: "hidden",
    active: "public",
    completed: "public",
  },
  oxygen: {
    pool: "public",
    playerOxygen: "public",
  },
  nanoTracker: "public",
  bunkerTracker: "public",
  specialMarkers: "public",
  mission22TokenPassBoard: "public",
  falseInfoTokenMode: "public",
  falseTokenMode: "public",
} as const;

// ── Redaction Helpers ──────────────────────────────────────

/** Redact a number card's value (replace with 0, force face-down). */
export function redactNumberCard(card: NumberCard): NumberCard {
  return { id: card.id, value: 0, faceUp: false };
}

/** Redact a challenge card's details (strip name/description). */
export function redactChallengeCard(card: ChallengeCard): ChallengeCard {
  return { id: card.id, name: "", description: "", completed: card.completed };
}

// ── Campaign State Filtering ───────────────────────────────

/**
 * Filter number card state for a specific player.
 * - deck: all cards redacted (count preserved)
 * - discard/visible: passed through
 * - playerHands: own hand passed through; others' face-down cards redacted
 */
export function filterNumberCards(
  state: NumberCardState,
  playerId: string,
): NumberCardState {
  const deck = state.deck.map(redactNumberCard);
  const playerHands: Record<string, NumberCard[]> = {};
  for (const [pid, hand] of Object.entries(state.playerHands)) {
    if (pid === playerId) {
      playerHands[pid] = hand;
    } else {
      playerHands[pid] = hand.map((card) =>
        card.faceUp ? card : redactNumberCard(card),
      );
    }
  }
  return { deck, discard: state.discard, visible: state.visible, playerHands };
}

/**
 * Filter challenge card state for a client.
 * - deck: all cards redacted (count preserved)
 * - active/completed: passed through
 */
export function filterChallenges(
  state: ChallengeCardState,
): ChallengeCardState {
  const deck = state.deck.map(redactChallengeCard);
  return { deck, active: state.active, completed: state.completed };
}

/**
 * Apply visibility rules to campaign state for a specific player.
 * Returns a filtered copy safe to send to the client.
 */
export function filterCampaignState(
  campaign: CampaignState,
  playerId: string,
): CampaignState {
  const isSpectator = playerId === "__spectator__";
  return {
    ...(campaign.numberCards
      ? {
          numberCards: isSpectator
            ? {
                ...filterNumberCards(campaign.numberCards, playerId),
                playerHands: campaign.numberCards.playerHands,
              }
            : filterNumberCards(campaign.numberCards, playerId),
        }
      : {}),
    ...(campaign.constraints ? { constraints: campaign.constraints } : {}),
    ...(campaign.challenges
      ? { challenges: filterChallenges(campaign.challenges) }
      : {}),
    ...(campaign.oxygen ? { oxygen: campaign.oxygen } : {}),
    ...(campaign.nanoTracker ? { nanoTracker: campaign.nanoTracker } : {}),
    ...(campaign.bunkerTracker ? { bunkerTracker: campaign.bunkerTracker } : {}),
    ...(campaign.specialMarkers
      ? { specialMarkers: campaign.specialMarkers }
      : {}),
    ...(campaign.mission22TokenPassBoard
      ? { mission22TokenPassBoard: campaign.mission22TokenPassBoard }
      : {}),
    ...(campaign.falseInfoTokenMode !== undefined
      ? { falseInfoTokenMode: campaign.falseInfoTokenMode }
      : {}),
    ...(campaign.falseTokenMode !== undefined
      ? { falseTokenMode: campaign.falseTokenMode }
      : {}),
  };
}
