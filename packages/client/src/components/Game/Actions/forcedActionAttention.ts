import type { ClientGameState } from "@bomb-busters/shared";

export type ActionAttentionState =
  | "normal_turn"
  | "normal_waiting"
  | "forced_actor"
  | "forced_waiting"
  | "forced_reveal_reds";

export type ActionAttention = {
  state: ActionAttentionState;
  forcedKind?: string;
  forcedActorId?: string;
  forcedActorName?: string;
  progressStep?: number;
  progressTotal?: number;
};

type PendingForcedRaw = Record<string, unknown> & { kind: string };

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asArrayLength(value: unknown): number | undefined {
  return Array.isArray(value) ? value.length : undefined;
}

function readPendingForcedAction(
  gameState: ClientGameState,
): PendingForcedRaw | null {
  const raw = (gameState as { pendingForcedAction?: unknown }).pendingForcedAction;
  if (!raw || typeof raw !== "object") return null;

  const candidate = raw as Record<string, unknown>;
  const kind = asString(candidate.kind);
  if (!kind) return null;
  return { ...candidate, kind };
}

function clampProgressStep(completedCount: number, total: number): number {
  return Math.max(1, Math.min(total, completedCount + 1));
}

function getPendingForcedMetadata(
  gameState: ClientGameState,
): {
  kind: string;
  actorId?: string;
  progressStep?: number;
  progressTotal?: number;
} | null {
  const forced = readPendingForcedAction(gameState);
  if (!forced) return null;

  switch (forced.kind) {
    case "chooseNextPlayer":
      return { kind: forced.kind, actorId: asString(forced.captainId) };
    case "designateCutter":
      return { kind: forced.kind, actorId: asString(forced.designatorId) };
    case "mission22TokenPass": {
      const total = asArrayLength(forced.passingOrder);
      const completedCount = asNumber(forced.completedCount) ?? 0;
      return {
        kind: forced.kind,
        actorId: asString(forced.currentChooserId),
        ...(total != null ? { progressTotal: total } : {}),
        ...(total != null ? { progressStep: clampProgressStep(completedCount, total) } : {}),
      };
    }
    case "mission27TokenDraft": {
      const total = asArrayLength(forced.draftOrder);
      const completedCount = asNumber(forced.completedCount) ?? 0;
      return {
        kind: forced.kind,
        actorId: asString(forced.currentChooserId),
        ...(total != null ? { progressTotal: total } : {}),
        ...(total != null ? { progressStep: clampProgressStep(completedCount, total) } : {}),
      };
    }
    case "detectorTileChoice":
      return { kind: forced.kind, actorId: asString(forced.targetPlayerId) };
    case "talkiesWalkiesTileChoice":
      return { kind: forced.kind, actorId: asString(forced.targetPlayerId) };
    case "mission61ConstraintRotate":
      return { kind: forced.kind, actorId: asString(forced.captainId) };
    case "mission36SequencePosition":
      return { kind: forced.kind, actorId: asString(forced.captainId) };
    case "mission46SevensCut":
      return { kind: forced.kind, actorId: asString(forced.playerId) };
    default:
      return { kind: forced.kind, actorId: asString(forced.captainId) };
  }
}

export function deriveActionAttentionState({
  gameState,
  playerId,
  revealRedsForcedNow,
}: {
  gameState: ClientGameState;
  playerId: string;
  revealRedsForcedNow: boolean;
}): ActionAttention {
  const forcedMeta = getPendingForcedMetadata(gameState);
  if (forcedMeta) {
    const forcedActorName = forcedMeta.actorId
      ? gameState.players.find((player) => player.id === forcedMeta.actorId)?.name
      : undefined;
    return {
      state: forcedMeta.actorId === playerId ? "forced_actor" : "forced_waiting",
      forcedKind: forcedMeta.kind,
      forcedActorId: forcedMeta.actorId,
      forcedActorName,
      progressStep: forcedMeta.progressStep,
      progressTotal: forcedMeta.progressTotal,
    };
  }

  if (revealRedsForcedNow) {
    const me = gameState.players.find((player) => player.id === playerId);
    return {
      state: "forced_reveal_reds",
      forcedKind: "revealRedsRequired",
      forcedActorId: playerId,
      forcedActorName: me?.name,
    };
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (currentPlayer?.id === playerId) {
    return { state: "normal_turn" };
  }

  return { state: "normal_waiting" };
}
