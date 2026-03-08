import { describe, it, expect } from "vitest";
import {
  CAMPAIGN_VISIBILITY,
  redactNumberCard,
  redactChallengeCard,
  filterNumberCards,
  filterChallenges,
  filterCampaignState,
} from "../visibility.js";
import {
  makeNumberCard,
  makeNumberCardState,
  makeChallengeCard,
  makeChallengeCardState,
  makeCampaignState,
  makeOxygenState,
  makeProgressTracker,
  makeSpecialMarker,
  makeConstraintCard,
  makeConstraintCardState,
} from "../testing/builders.js";

// ── Visibility model constant ──────────────────────────────

describe("CAMPAIGN_VISIBILITY", () => {
  it("marks number card deck as hidden", () => {
    expect(CAMPAIGN_VISIBILITY.numberCards.deck).toBe("hidden");
  });

  it("marks number card discard and visible as public", () => {
    expect(CAMPAIGN_VISIBILITY.numberCards.discard).toBe("public");
    expect(CAMPAIGN_VISIBILITY.numberCards.visible).toBe("public");
  });

  it("marks number card playerHands as owner_only", () => {
    expect(CAMPAIGN_VISIBILITY.numberCards.playerHands).toBe("owner_only");
  });

  it("marks all constraint fields as public", () => {
    expect(CAMPAIGN_VISIBILITY.constraints.global).toBe("public");
    expect(CAMPAIGN_VISIBILITY.constraints.perPlayer).toBe("public");
  });

  it("marks challenge deck as hidden, active/completed as public", () => {
    expect(CAMPAIGN_VISIBILITY.challenges.deck).toBe("hidden");
    expect(CAMPAIGN_VISIBILITY.challenges.active).toBe("public");
    expect(CAMPAIGN_VISIBILITY.challenges.completed).toBe("public");
  });

  it("marks all oxygen fields as public", () => {
    expect(CAMPAIGN_VISIBILITY.oxygen.pool).toBe("public");
    expect(CAMPAIGN_VISIBILITY.oxygen.playerOxygen).toBe("public");
  });

  it("marks trackers and markers as public", () => {
    expect(CAMPAIGN_VISIBILITY.nanoTracker).toBe("public");
    expect(CAMPAIGN_VISIBILITY.bunkerTracker).toBe("public");
    expect(CAMPAIGN_VISIBILITY.mission66Bunker).toBe("public");
    expect(CAMPAIGN_VISIBILITY.specialMarkers).toBe("public");
  });

  it("marks mission 22 token-pass board as public", () => {
    expect(CAMPAIGN_VISIBILITY.mission22TokenPassBoard).toBe("public");
  });

  it("marks mission 27 token-draft board as public", () => {
    expect(CAMPAIGN_VISIBILITY.mission27TokenDraftBoard).toBe("public");
  });

  it("marks false setup token campaign flags as public", () => {
    expect(CAMPAIGN_VISIBILITY.falseInfoTokenMode).toBe("public");
    expect(CAMPAIGN_VISIBILITY.falseTokenMode).toBe("public");
  });

  it("marks mission45Turn as public", () => {
    expect(CAMPAIGN_VISIBILITY.mission45Turn).toBe("public");
  });
});

// ── Redaction helpers ──────────────────────────────────────

describe("redactNumberCard", () => {
  it("strips value and forces faceUp to false", () => {
    const card = makeNumberCard({ id: "n5", value: 7, faceUp: true });
    const redacted = redactNumberCard(card);
    expect(redacted).toEqual({ id: "n5", value: 0, faceUp: false });
  });

  it("uses the provided redacted id override", () => {
    const card = makeNumberCard({ id: "n5", value: 7, faceUp: true });
    const redacted = redactNumberCard(card, "hidden_number_deck_0");
    expect(redacted).toEqual({ id: "hidden_number_deck_0", value: 0, faceUp: false });
  });
});

describe("redactChallengeCard", () => {
  it("strips name and description, preserves id and completed", () => {
    const card = makeChallengeCard({
      id: "ch-3",
      name: "Secret",
      description: "Do something",
      completed: true,
    });
    const redacted = redactChallengeCard(card);
    expect(redacted).toEqual({
      id: "ch-3",
      name: "",
      description: "",
      completed: true,
    });
  });

  it("uses the provided redacted id override", () => {
    const card = makeChallengeCard({
      id: "ch-3",
      name: "Secret",
      description: "Do something",
      completed: true,
    });
    const redacted = redactChallengeCard(card, "hidden_challenge_deck_0");
    expect(redacted).toEqual({
      id: "hidden_challenge_deck_0",
      name: "",
      description: "",
      completed: true,
    });
  });
});

// ── filterNumberCards ──────────────────────────────────────

describe("filterNumberCards", () => {
  it("redacts all deck cards", () => {
    const state = makeNumberCardState({
      deck: [
        makeNumberCard({ id: "d1", value: 3 }),
        makeNumberCard({ id: "d2", value: 8 }),
      ],
    });
    const filtered = filterNumberCards(state, "p1");
    expect(filtered.deck).toHaveLength(2);
    expect(filtered.deck[0]).toEqual({ id: "hidden_number_deck_0", value: 0, faceUp: false });
    expect(filtered.deck[1]).toEqual({ id: "hidden_number_deck_1", value: 0, faceUp: false });
  });

  it("passes through discard unchanged and maps visible face-up cards with same values", () => {
    const discard = [makeNumberCard({ id: "dis1", value: 4, faceUp: true })];
    const visible = [makeNumberCard({ id: "vis1", value: 9, faceUp: true })];
    const state = makeNumberCardState({ discard, visible });
    const filtered = filterNumberCards(state, "p1");
    expect(filtered.discard).toBe(discard);
    expect(filtered.visible).toEqual(visible);
  });

  it("redacts face-down visible cards", () => {
    const visible = [makeNumberCard({ id: "vis1", value: 7, faceUp: false })];
    const state = makeNumberCardState({ visible });
    const filtered = filterNumberCards(state, "p1");
    expect(filtered.visible).toHaveLength(1);
    expect(filtered.visible[0]).toEqual({
      id: "hidden_number_visible_0",
      value: 0,
      faceUp: false,
    });
  });

  it("passes through own player hand unchanged", () => {
    const myHand = [
      makeNumberCard({ id: "h1", value: 5, faceUp: false }),
      makeNumberCard({ id: "h2", value: 10, faceUp: true }),
    ];
    const state = makeNumberCardState({ playerHands: { p1: myHand } });
    const filtered = filterNumberCards(state, "p1");
    expect(filtered.playerHands["p1"]).toBe(myHand);
  });

  it("redacts other players' face-down cards but keeps face-up cards", () => {
    const faceDown = makeNumberCard({ id: "o1", value: 6, faceUp: false });
    const faceUp = makeNumberCard({ id: "o2", value: 11, faceUp: true });
    const state = makeNumberCardState({
      playerHands: { p1: [], p2: [faceDown, faceUp] },
    });
    const filtered = filterNumberCards(state, "p1");
    expect(filtered.playerHands["p2"]).toHaveLength(2);
    expect(filtered.playerHands["p2"][0]).toEqual({
      id: "hidden_number_hand_p2_0",
      value: 0,
      faceUp: false,
    });
    // face-up card passes through with original reference
    expect(filtered.playerHands["p2"][1]).toBe(faceUp);
  });
});

// ── filterChallenges ───────────────────────────────────────

describe("filterChallenges", () => {
  it("redacts deck cards, passes through active and completed", () => {
    const deckCard = makeChallengeCard({ id: "cd1", name: "Secret" });
    const activeCard = makeChallengeCard({ id: "ca1", name: "Active" });
    const doneCard = makeChallengeCard({
      id: "cc1",
      name: "Done",
      completed: true,
    });
    const state = makeChallengeCardState({
      deck: [deckCard],
      active: [activeCard],
      completed: [doneCard],
    });
    const filtered = filterChallenges(state);
    expect(filtered.deck[0].name).toBe("");
    expect(filtered.deck[0].description).toBe("");
    expect(filtered.active).toBe(state.active);
    expect(filtered.completed).toBe(state.completed);
  });
});

// ── filterCampaignState ────────────────────────────────────

describe("filterCampaignState", () => {
  it("returns empty object for empty campaign", () => {
    const campaign = makeCampaignState();
    const filtered = filterCampaignState(campaign, "p1");
    expect(filtered.numberCards).toBeUndefined();
    expect(filtered.constraints).toBeUndefined();
    expect(filtered.challenges).toBeUndefined();
    expect(filtered.oxygen).toBeUndefined();
    expect(filtered.nanoTracker).toBeUndefined();
    expect(filtered.bunkerTracker).toBeUndefined();
    expect(filtered.specialMarkers).toBeUndefined();
  });

  it("filters numberCards when present", () => {
    const campaign = makeCampaignState({
      numberCards: makeNumberCardState({
        deck: [makeNumberCard({ value: 5 })],
        playerHands: {
          p1: [makeNumberCard({ id: "mine", value: 3 })],
          p2: [makeNumberCard({ id: "theirs", value: 7 })],
        },
      }),
    });
    const filtered = filterCampaignState(campaign, "p1");
    // deck redacted
    expect(filtered.numberCards!.deck[0].value).toBe(0);
    // own hand preserved
    expect(filtered.numberCards!.playerHands["p1"][0].value).toBe(3);
    // other's face-down card redacted
    expect(filtered.numberCards!.playerHands["p2"][0].value).toBe(0);
    expect(filtered.numberCards!.playerHands["p2"][0].id).toBe("hidden_number_hand_p2_0");
  });

  it("redacts spectator view for all private number-card hands", () => {
    const campaign = makeCampaignState({
      numberCards: makeNumberCardState({
        playerHands: {
          p1: [makeNumberCard({ id: "p1-secret", value: 3, faceUp: false })],
          p2: [makeNumberCard({ id: "p2-secret", value: 7, faceUp: false })],
        },
      }),
    });
    const filtered = filterCampaignState(campaign, "__spectator__");
    expect(filtered.numberCards!.playerHands["p1"][0]).toEqual({
      id: "hidden_number_hand_p1_0",
      value: 0,
      faceUp: false,
    });
    expect(filtered.numberCards!.playerHands["p2"][0]).toEqual({
      id: "hidden_number_hand_p2_0",
      value: 0,
      faceUp: false,
    });
  });

  it("passes constraints through unchanged", () => {
    const constraints = makeConstraintCardState({
      global: [makeConstraintCard({ name: "No talking" })],
      perPlayer: { p1: [makeConstraintCard({ name: "Cut ascending" })] },
    });
    const campaign = makeCampaignState({ constraints });
    const filtered = filterCampaignState(campaign, "p1");
    expect(filtered.constraints).toBe(constraints);
  });

  it("filters challenges when present", () => {
    const campaign = makeCampaignState({
      challenges: makeChallengeCardState({
        deck: [makeChallengeCard({ name: "Hidden" })],
        active: [makeChallengeCard({ name: "Visible" })],
      }),
    });
    const filtered = filterCampaignState(campaign, "p1");
    expect(filtered.challenges!.deck[0].name).toBe("");
    expect(filtered.challenges!.active[0].name).toBe("Visible");
  });

  it("passes oxygen through unchanged", () => {
    const oxygen = makeOxygenState({ pool: 15, playerOxygen: { p1: 3 } });
    const campaign = makeCampaignState({ oxygen });
    const filtered = filterCampaignState(campaign, "p1");
    expect(filtered.oxygen).toBe(oxygen);
  });

  it("passes trackers through unchanged", () => {
    const nano = makeProgressTracker({ position: 2, max: 8 });
    const bunker = makeProgressTracker({ position: 1, max: 5 });
    const campaign = makeCampaignState({
      nanoTracker: nano,
      bunkerTracker: bunker,
      mission66Bunker: {
        position: { floor: "front", row: 0, col: 0 },
        constraints: {
          north: makeConstraintCard({ id: "A", active: true }),
          south: makeConstraintCard({ id: "B", active: true }),
          east: makeConstraintCard({ id: "C", active: true }),
          west: makeConstraintCard({ id: "D", active: true }),
          action: makeConstraintCard({ id: "E", active: true }),
        },
        frontKeyActivated: false,
        frontSkullActivated: false,
        backAlarmActivated: false,
        backDetonatorActivated: false,
      },
    });
    const filtered = filterCampaignState(campaign, "p1");
    expect(filtered.nanoTracker).toBe(nano);
    expect(filtered.bunkerTracker).toBe(bunker);
    expect(filtered.mission66Bunker).toEqual(campaign.mission66Bunker);
  });

  it("passes specialMarkers through unchanged", () => {
    const markers = [makeSpecialMarker({ kind: "x", value: 5 })];
    const campaign = makeCampaignState({ specialMarkers: markers });
    const filtered = filterCampaignState(campaign, "p1");
    expect(filtered.specialMarkers).toBe(markers);
  });

  it("passes mission22 token-pass board through unchanged", () => {
    const board = { numericTokens: [1, 5], yellowTokens: 1 };
    const campaign = makeCampaignState({ mission22TokenPassBoard: board });
    const filtered = filterCampaignState(campaign, "p1");
    expect(filtered.mission22TokenPassBoard).toEqual(board);
  });

  it("passes mission27 token-draft board through unchanged", () => {
    const board = { numericTokens: [2, 7], yellowTokens: 1 };
    const campaign = makeCampaignState({ mission27TokenDraftBoard: board });
    const filtered = filterCampaignState(campaign, "p1");
    expect(filtered.mission27TokenDraftBoard).toEqual(board);
  });

  it("passes false setup token flags through unchanged", () => {
    const campaign = makeCampaignState({
      falseInfoTokenMode: true,
      falseTokenMode: true,
    });
    const filtered = filterCampaignState(campaign, "p1");
    expect(filtered.falseInfoTokenMode).toBe(true);
    expect(filtered.falseTokenMode).toBe(true);
  });

  it("passes mission29Turn through unchanged", () => {
    const turn = { actorId: "p1", chooserId: "p2", matchedCut: false, skipReveal: false };
    const campaign = makeCampaignState({ mission29Turn: turn });
    const filtered = filterCampaignState(campaign, "p1");
    expect(filtered.mission29Turn).toEqual(turn);
  });

  it("passes mission45Turn through unchanged", () => {
    const turn = {
      stage: "awaiting_volunteer" as const,
      captainId: "p1",
      currentCardId: "num-7",
      currentValue: 7,
    };
    const campaign = makeCampaignState({ mission45Turn: turn });
    const filtered = filterCampaignState(campaign, "p1");
    expect(filtered.mission45Turn).toEqual(turn);
  });
});
