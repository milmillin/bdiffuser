/**
 * Pure functions extracted from GameBoard.tsx for equipment mode interactions.
 * These take state + mode → return values, no React hooks.
 */
import type { ClientGameState, ClientMessage, ClientPlayer, VisibleTile } from "@bomb-busters/shared";
import type { EquipmentMode } from "./Actions/EquipmentModePanel.js";

type PostItMissionContext = Pick<ClientGameState, "mission">;

function canPostItTargetCutWire(
  gameState: PostItMissionContext | undefined,
): boolean {
  return gameState?.mission === 24 || gameState?.mission === 40;
}

// --- Selectability filters ---

export function getOpponentTileSelectableFilter(
  mode: EquipmentMode | null,
  oppId: string,
): ((tile: VisibleTile, idx: number) => boolean) | undefined {
  if (!mode) return undefined;
  switch (mode.kind) {
    case "double_detector":
      if (mode.targetPlayerId && mode.targetPlayerId !== oppId) return () => false;
      return (tile) => !tile.cut;
    case "talkies_walkies":
      return () => false;
    case "triple_detector":
      if (mode.targetPlayerId && mode.targetPlayerId !== oppId) return () => false;
      return (tile) => !tile.cut;
    case "super_detector":
      return (tile) => !tile.cut;
    case "x_or_y_ray":
      return (tile) => !tile.cut;
    case "grappling_hook":
      return (tile) => !tile.cut;
    default:
      return () => false;
  }
}

export function getOwnTileSelectableFilter(
  mode: EquipmentMode | null,
  me: ClientPlayer | undefined,
  gameState?: PostItMissionContext,
): ((tile: VisibleTile, idx: number) => boolean) | undefined {
  if (!mode || !me) return undefined;
  switch (mode.kind) {
    case "post_it": {
      const allowCutTile = canPostItTargetCutWire(gameState);
      return (tile, idx) =>
        (allowCutTile || !tile.cut) &&
        tile.color === "blue" &&
        typeof tile.gameValue === "number" &&
        !me.infoTokens.some((t) => t.position === idx);
    }
    case "double_detector":
      return (tile) => !tile.cut && tile.color === "blue" && typeof tile.gameValue === "number";
    case "label_eq":
      if (mode.firstTileIndex === null) return (tile) => !tile.cut;
      return (tile, idx) => !tile.cut && Math.abs(idx - mode.firstTileIndex!) === 1;
    case "label_neq":
      if (mode.firstTileIndex === null) return () => true;
      return (tile, idx) => {
        if (Math.abs(idx - mode.firstTileIndex!) !== 1) return false;
        const firstTile = me.hand[mode.firstTileIndex!];
        if (!firstTile) return false;
        return !(firstTile.cut && tile.cut);
      };
    case "talkies_walkies":
      return (tile) => !tile.cut;
    case "triple_detector":
      return (tile) => !tile.cut && tile.color === "blue" && typeof tile.gameValue === "number";
    case "super_detector":
      return (tile) => !tile.cut && tile.color === "blue" && typeof tile.gameValue === "number";
    case "x_or_y_ray": {
      if (mode.guessATileIndex === null) {
        return (tile) => !tile.cut && (tile.color === "blue" || tile.color === "yellow");
      }
      if (mode.guessBTileIndex === null) {
        const valueA = me.hand[mode.guessATileIndex]?.gameValue;
        return (tile) =>
          !tile.cut && (tile.color === "blue" || tile.color === "yellow") && tile.gameValue !== valueA;
      }
      return () => false;
    }
    default:
      return () => false;
  }
}

// --- Selection highlights ---

export function getOpponentSelectedTileIndex(
  mode: EquipmentMode | null,
  oppId: string,
): number | undefined {
  if (!mode) return undefined;
  switch (mode.kind) {
    case "x_or_y_ray":
      return mode.targetPlayerId === oppId ? (mode.targetTileIndex ?? undefined) : undefined;
    case "grappling_hook":
      return mode.targetPlayerId === oppId ? (mode.targetTileIndex ?? undefined) : undefined;
    default:
      return undefined;
  }
}

export function getOpponentSelectedTileIndices(
  mode: EquipmentMode | null,
  oppId: string,
): number[] | undefined {
  if (!mode) return undefined;
  switch (mode.kind) {
    case "double_detector":
      return mode.targetPlayerId === oppId ? mode.selectedTiles : undefined;
    case "triple_detector":
      return mode.targetPlayerId === oppId ? mode.targetTileIndices : undefined;
    default:
      return undefined;
  }
}

export function getOwnSelectedTileIndex(
  mode: EquipmentMode | null,
): number | undefined {
  if (!mode) return undefined;
  switch (mode.kind) {
    case "double_detector":
      return mode.guessTileIndex ?? undefined;
    case "label_eq":
    case "label_neq":
      return mode.firstTileIndex ?? undefined;
    case "talkies_walkies":
      return mode.myTileIndex ?? undefined;
    case "triple_detector":
      return mode.guessTileIndex ?? undefined;
    case "super_detector":
      return mode.guessTileIndex ?? undefined;
    default:
      return undefined;
  }
}

export function getOwnSelectedTileIndices(
  mode: EquipmentMode | null,
): number[] | undefined {
  if (!mode) return undefined;
  if (mode.kind === "x_or_y_ray") {
    const indices: number[] = [];
    if (mode.guessATileIndex != null) indices.push(mode.guessATileIndex);
    if (mode.guessBTileIndex != null) indices.push(mode.guessBTileIndex);
    return indices.length > 0 ? indices : undefined;
  }
  return undefined;
}

// --- Click handlers (return new state, no side effects) ---

export function handleOpponentTileClick(
  mode: EquipmentMode | null,
  oppId: string,
  tileIndex: number,
): EquipmentMode | null {
  if (!mode) return null;
  switch (mode.kind) {
    case "double_detector": {
      if (mode.targetPlayerId && mode.targetPlayerId !== oppId) return mode;
      const newTiles = mode.selectedTiles.includes(tileIndex)
        ? mode.selectedTiles.filter((i) => i !== tileIndex)
        : mode.selectedTiles.length >= 2
          ? mode.selectedTiles
          : [...mode.selectedTiles, tileIndex];
      return {
        ...mode,
        targetPlayerId: newTiles.length > 0 ? oppId : null,
        selectedTiles: newTiles,
        guessTileIndex: mode.guessTileIndex,
      };
    }
    case "talkies_walkies": {
      if (mode.teammateId === oppId) {
        return { ...mode, teammateId: null, teammateTileIndex: null };
      }
      return {
        ...mode,
        teammateId: oppId,
        teammateTileIndex: null,
        myTileIndex: mode.myTileIndex,
      };
    }
    case "triple_detector": {
      if (mode.targetPlayerId && mode.targetPlayerId !== oppId) return mode;
      const newTiles = mode.targetTileIndices.includes(tileIndex)
        ? mode.targetTileIndices.filter((i) => i !== tileIndex)
        : mode.targetTileIndices.length >= 3
          ? mode.targetTileIndices
          : [...mode.targetTileIndices, tileIndex];
      return {
        ...mode,
        targetPlayerId: newTiles.length > 0 ? oppId : null,
        targetTileIndices: newTiles,
        guessTileIndex: mode.guessTileIndex,
      };
    }
    case "super_detector": {
      if (mode.targetPlayerId === oppId) {
        return { ...mode, targetPlayerId: null, targetStandIndex: null };
      }
      return {
        ...mode,
        targetPlayerId: oppId,
        targetStandIndex: null,
        guessTileIndex: mode.guessTileIndex,
      };
    }
    case "x_or_y_ray": {
      if (mode.targetPlayerId === oppId && mode.targetTileIndex === tileIndex) {
        return { ...mode, targetPlayerId: null, targetTileIndex: null };
      }
      return {
        ...mode,
        targetPlayerId: oppId,
        targetTileIndex: tileIndex,
        guessATileIndex: mode.guessATileIndex,
        guessBTileIndex: mode.guessBTileIndex,
      };
    }
    case "grappling_hook": {
      if (mode.targetPlayerId === oppId && mode.targetTileIndex === tileIndex) {
        return { ...mode, targetPlayerId: null, targetTileIndex: null };
      }
      return { ...mode, targetPlayerId: oppId, targetTileIndex: tileIndex };
    }
    default:
      return mode;
  }
}

export type OwnTileClickResult = {
  newMode: EquipmentMode | null;
  sendPayload?: ClientMessage;
};

export function handleOwnTileClickEquipment(
  mode: EquipmentMode | null,
  tileIndex: number,
  me: ClientPlayer | undefined,
  gameState?: PostItMissionContext,
): OwnTileClickResult {
  if (!mode || !me) return { newMode: mode };
  const tile = me.hand[tileIndex];
  const allowCutTile =
    (mode.kind === "post_it" && canPostItTargetCutWire(gameState))
    || mode.kind === "label_neq";
  if (!tile || (tile.cut && !allowCutTile)) return { newMode: mode };

  switch (mode.kind) {
    case "post_it": {
      if (tile.color !== "blue" || typeof tile.gameValue !== "number") return { newMode: mode };
      if (me.infoTokens.some((t) => t.position === tileIndex)) return { newMode: mode };
      return {
        newMode: null,
        sendPayload: {
          type: "useEquipment",
          equipmentId: "post_it",
          payload: { kind: "post_it", tileIndex },
        },
      };
    }
    case "double_detector": {
      if (tile.color !== "blue" || typeof tile.gameValue !== "number") return { newMode: mode };
      if (mode.guessTileIndex === tileIndex) return { newMode: { ...mode, guessTileIndex: null } };
      return { newMode: { ...mode, guessTileIndex: tileIndex } };
    }
    case "label_eq": {
      if (mode.firstTileIndex === null) {
        return { newMode: { ...mode, firstTileIndex: tileIndex } };
      }
      if (tileIndex === mode.firstTileIndex) {
        return { newMode: { ...mode, firstTileIndex: null } };
      }
      if (Math.abs(tileIndex - mode.firstTileIndex) !== 1) return { newMode: mode };
      return {
        newMode: null,
        sendPayload: {
          type: "useEquipment",
          equipmentId: mode.kind,
          payload: {
            kind: mode.kind,
            tileIndexA: mode.firstTileIndex,
            tileIndexB: tileIndex,
          },
        },
      };
    }
    case "label_neq": {
      if (mode.firstTileIndex === null) {
        return { newMode: { ...mode, firstTileIndex: tileIndex } };
      }
      if (tileIndex === mode.firstTileIndex) {
        return { newMode: { ...mode, firstTileIndex: null } };
      }
      if (Math.abs(tileIndex - mode.firstTileIndex) !== 1) return { newMode: mode };
      const firstTile = me.hand[mode.firstTileIndex];
      if (!firstTile || (firstTile.cut && tile.cut)) return { newMode: mode };
      return {
        newMode: null,
        sendPayload: {
          type: "useEquipment",
          equipmentId: mode.kind,
          payload: {
            kind: mode.kind,
            tileIndexA: mode.firstTileIndex,
            tileIndexB: tileIndex,
          },
        },
      };
    }
    case "talkies_walkies": {
      if (mode.myTileIndex === tileIndex) return { newMode: { ...mode, myTileIndex: null } };
      return { newMode: { ...mode, myTileIndex: tileIndex } };
    }
    case "triple_detector": {
      if (tile.color !== "blue" || typeof tile.gameValue !== "number") return { newMode: mode };
      if (mode.guessTileIndex === tileIndex) return { newMode: { ...mode, guessTileIndex: null } };
      return { newMode: { ...mode, guessTileIndex: tileIndex } };
    }
    case "super_detector": {
      if (tile.color !== "blue" || typeof tile.gameValue !== "number") return { newMode: mode };
      if (mode.guessTileIndex === tileIndex) return { newMode: { ...mode, guessTileIndex: null } };
      return { newMode: { ...mode, guessTileIndex: tileIndex } };
    }
    case "x_or_y_ray": {
      if (tile.color !== "blue" && tile.color !== "yellow") return { newMode: mode };
      if (mode.guessATileIndex === tileIndex) {
        return { newMode: { ...mode, guessATileIndex: null, guessBTileIndex: null } };
      }
      if (mode.guessBTileIndex === tileIndex) {
        return { newMode: { ...mode, guessBTileIndex: null } };
      }
      if (mode.guessATileIndex === null) {
        return { newMode: { ...mode, guessATileIndex: tileIndex } };
      }
      if (mode.guessBTileIndex === null) {
        const tileA = me.hand[mode.guessATileIndex];
        if (tileA?.gameValue === tile.gameValue) return { newMode: mode };
        return { newMode: { ...mode, guessBTileIndex: tileIndex } };
      }
      return { newMode: mode };
    }
    default:
      return { newMode: mode };
  }
}
