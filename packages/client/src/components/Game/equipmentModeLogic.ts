/**
 * Pure functions extracted from GameBoard.tsx for equipment mode interactions.
 * These take state + mode → return values, no React hooks.
 */
import type { ClientGameState, ClientMessage, ClientPlayer, VisibleTile } from "@bomb-busters/shared";
import type { EquipmentMode } from "./Actions/EquipmentModePanel.js";

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
      return (tile) => !tile.cut;
    case "triple_detector":
      if (mode.targetPlayerId && mode.targetPlayerId !== oppId) return () => false;
      return (tile) => !tile.cut;
    case "super_detector":
      return (tile) => !tile.cut;
    case "x_or_y_ray":
      return (tile) => !tile.cut;
    default:
      return () => false;
  }
}

export function getOwnTileSelectableFilter(
  mode: EquipmentMode | null,
  me: ClientPlayer | undefined,
): ((tile: VisibleTile, idx: number) => boolean) | undefined {
  if (!mode || !me) return undefined;
  switch (mode.kind) {
    case "post_it":
      return (tile, idx) =>
        !tile.cut &&
        tile.color === "blue" &&
        typeof tile.gameValue === "number" &&
        !me.infoTokens.some((t) => t.position === idx);
    case "double_detector":
      if (mode.selectedTiles.length < 2) return () => false;
      return (tile) => !tile.cut && tile.color === "blue" && typeof tile.gameValue === "number";
    case "label_eq":
    case "label_neq":
      if (mode.firstTileIndex === null) return (tile) => !tile.cut;
      return (tile, idx) => !tile.cut && Math.abs(idx - mode.firstTileIndex!) === 1;
    case "talkies_walkies":
      if (!mode.teammateId) return () => false;
      return (tile) => !tile.cut;
    case "triple_detector":
      if (mode.targetTileIndices.length < 3) return () => false;
      return (tile) => !tile.cut && tile.color === "blue" && typeof tile.gameValue === "number";
    case "super_detector":
      if (!mode.targetPlayerId) return () => false;
      return (tile) => !tile.cut && tile.color === "blue" && typeof tile.gameValue === "number";
    case "x_or_y_ray": {
      if (!mode.targetPlayerId || mode.targetTileIndex === null) return () => false;
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
    case "talkies_walkies":
      return mode.teammateId === oppId ? (mode.teammateTileIndex ?? undefined) : undefined;
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
        guessTileIndex: newTiles.length < 2 ? null : mode.guessTileIndex,
      };
    }
    case "talkies_walkies": {
      return {
        ...mode,
        teammateId: oppId,
        teammateTileIndex: tileIndex,
        myTileIndex: null,
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
        guessTileIndex: newTiles.length < 3 ? null : mode.guessTileIndex,
      };
    }
    case "super_detector": {
      return {
        ...mode,
        targetPlayerId: oppId,
        guessTileIndex: mode.targetPlayerId !== oppId ? null : mode.guessTileIndex,
      };
    }
    case "x_or_y_ray": {
      const changed = mode.targetPlayerId !== oppId || mode.targetTileIndex !== tileIndex;
      return {
        ...mode,
        targetPlayerId: oppId,
        targetTileIndex: tileIndex,
        guessATileIndex: changed ? null : mode.guessATileIndex,
        guessBTileIndex: changed ? null : mode.guessBTileIndex,
      };
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
): OwnTileClickResult {
  if (!mode || !me) return { newMode: mode };
  const tile = me.hand[tileIndex];
  if (!tile || tile.cut) return { newMode: mode };

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
      if (mode.selectedTiles.length !== 2) return { newMode: mode };
      if (tile.color !== "blue" || typeof tile.gameValue !== "number") return { newMode: mode };
      return { newMode: { ...mode, guessTileIndex: tileIndex } };
    }
    case "label_eq":
    case "label_neq": {
      if (mode.firstTileIndex === null) {
        return { newMode: { ...mode, firstTileIndex: tileIndex } };
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
    case "talkies_walkies": {
      if (!mode.teammateId || mode.teammateTileIndex === null) return { newMode: mode };
      return {
        newMode: null,
        sendPayload: {
          type: "useEquipment",
          equipmentId: "talkies_walkies",
          payload: {
            kind: "talkies_walkies",
            teammateId: mode.teammateId,
            myTileIndex: tileIndex,
            teammateTileIndex: mode.teammateTileIndex,
          },
        },
      };
    }
    case "triple_detector": {
      if (mode.targetTileIndices.length !== 3 || !mode.targetPlayerId) return { newMode: mode };
      if (tile.color !== "blue" || typeof tile.gameValue !== "number") return { newMode: mode };
      return { newMode: { ...mode, guessTileIndex: tileIndex } };
    }
    case "super_detector": {
      if (!mode.targetPlayerId) return { newMode: mode };
      if (tile.color !== "blue" || typeof tile.gameValue !== "number") return { newMode: mode };
      return { newMode: { ...mode, guessTileIndex: tileIndex } };
    }
    case "x_or_y_ray": {
      if (!mode.targetPlayerId || mode.targetTileIndex === null) return { newMode: mode };
      if (tile.color !== "blue" && tile.color !== "yellow") return { newMode: mode };
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
