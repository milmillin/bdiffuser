/**
 * Pure functions extracted from GameBoard.tsx for equipment mode interactions.
 * These take state + mode → return values, no React hooks.
 */
import type {
  ClientGameState,
  ClientMessage,
  ClientPlayer,
  MissionId,
  VisibleTile,
} from "@bomb-busters/shared";
import { hasXMarkedWireTalkiesRestriction } from "@bomb-busters/shared";
import type { EquipmentMode } from "./Actions/EquipmentModePanel.js";

type PostItMissionContext = Pick<ClientGameState, "mission">;

function canPostItTargetCutWire(
  gameState: PostItMissionContext | undefined,
): boolean {
  return gameState?.mission === 24 || gameState?.mission === 40;
}

function isMissionRestrictedDetectorTarget(
  tile: VisibleTile,
  mission: number | undefined,
): boolean {
  if (mission === 13) {
    return tile.color !== "blue";
  }

  if (mission === 41 || mission === 48) {
    return tile.color === "yellow";
  }

  return false;
}

function getPlayerStandSizes(player: Pick<ClientPlayer, "hand" | "standSizes">): number[] {
  if (!Array.isArray(player.standSizes) || player.standSizes.length === 0) {
    return [player.hand.length];
  }

  if (!player.standSizes.every((size) => Number.isInteger(size) && size >= 0)) {
    return [player.hand.length];
  }

  const total = player.standSizes.reduce((sum, size) => sum + size, 0);
  if (total !== player.hand.length) {
    return [player.hand.length];
  }

  return player.standSizes;
}

function flatIndexToStandIndex(
  player: Pick<ClientPlayer, "hand" | "standSizes">,
  flatIndex: number,
): number | null {
  if (!Number.isInteger(flatIndex) || flatIndex < 0 || flatIndex >= player.hand.length) {
    return null;
  }

  const standSizes = getPlayerStandSizes(player);
  let cursor = 0;
  for (let standIndex = 0; standIndex < standSizes.length; standIndex += 1) {
    const size = standSizes[standIndex] ?? 0;
    const endExclusive = cursor + size;
    if (flatIndex < endExclusive) {
      return standIndex;
    }
    cursor = endExclusive;
  }

  return null;
}

function areFlatIndicesOnSameStand(
  player: Pick<ClientPlayer, "hand" | "standSizes">,
  indexA: number,
  indexB: number,
): boolean {
  const standA = flatIndexToStandIndex(player, indexA);
  const standB = flatIndexToStandIndex(player, indexB);
  return standA != null && standA === standB;
}

function areFlatIndicesAdjacentWithinStand(
  player: Pick<ClientPlayer, "hand" | "standSizes">,
  indexA: number,
  indexB: number,
): boolean {
  return Math.abs(indexA - indexB) === 1 && areFlatIndicesOnSameStand(player, indexA, indexB);
}

function isLabelEqual(tileA: VisibleTile, tileB: VisibleTile): boolean {
  if (tileA.color === "red" && tileB.color === "red") return true;
  if (tileA.color === "yellow" && tileB.color === "yellow") return true;
  if (tileA.color === "blue" && tileB.color === "blue") {
    return tileA.gameValue === tileB.gameValue;
  }
  return false;
}

// --- Selectability filters ---

export function getOpponentTileSelectableFilter(
  mode: EquipmentMode | null,
  oppId: string,
  mission?: MissionId,
  targetPlayer?: ClientPlayer,
): ((tile: VisibleTile, idx: number) => boolean) | undefined {
  if (!mode) return undefined;
  const hasXRestriction = mission != null
    && hasXMarkedWireTalkiesRestriction(mission);
  switch (mode.kind) {
    case "double_detector":
      if (mode.targetPlayerId && mode.targetPlayerId !== oppId) return () => false;
      return (tile, idx) => {
        if (tile.cut || isMissionRestrictedDetectorTarget(tile, mission)) return false;
        if (
          mode.targetPlayerId === oppId &&
          mode.selectedTiles.length > 0 &&
          targetPlayer
        ) {
          return areFlatIndicesOnSameStand(
            targetPlayer,
            mode.selectedTiles[0]!,
            idx,
          );
        }
        return true;
      };
    case "talkies_walkies":
      return (tile) => !tile.cut && !(hasXRestriction && tile.isXMarked);
    case "triple_detector":
      if (mode.targetPlayerId && mode.targetPlayerId !== oppId) return () => false;
      return (tile, idx) => {
        if (
          tile.cut ||
          isMissionRestrictedDetectorTarget(tile, mission) ||
          (hasXRestriction && tile.isXMarked)
        ) {
          return false;
        }
        if (
          mode.targetPlayerId === oppId &&
          mode.targetTileIndices.length > 0 &&
          targetPlayer
        ) {
          return areFlatIndicesOnSameStand(
            targetPlayer,
            mode.targetTileIndices[0]!,
            idx,
          );
        }
        return true;
      };
    case "super_detector":
      return (tile) => !tile.cut && !isMissionRestrictedDetectorTarget(tile, mission);
    case "x_or_y_ray":
      return (tile) =>
        !tile.cut &&
        !isMissionRestrictedDetectorTarget(tile, mission) &&
        !(hasXRestriction && tile.isXMarked);
    case "grappling_hook":
      return (tile) =>
        !tile.cut &&
        !((mission === 41 || mission === 48) && tile.color === "yellow") &&
        !(hasXRestriction && tile.isXMarked);
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
  const hasXRestriction = gameState?.mission != null
    && hasXMarkedWireTalkiesRestriction(gameState.mission);
  switch (mode.kind) {
    case "post_it": {
      const allowCutTile = canPostItTargetCutWire(gameState);
      return (tile, idx) =>
        (allowCutTile || !tile.cut) &&
        tile.color === "blue" &&
        typeof tile.gameValue === "number" &&
        !me.infoTokens.some((t) => t.position === idx);
    }
    case "single_wire_label": {
      return (tile, idx) => {
        if (tile.color !== "blue" || typeof tile.gameValue !== "number") return false;
        if (me.infoTokens.some((t) => t.position === idx && t.singleWire)) return false;
        // Value must appear exactly once on the stand (cut or uncut)
        const valueCount = me.hand.filter(
          (t) => t.color === "blue" && t.gameValue === tile.gameValue,
        ).length;
        return valueCount === 1;
      };
    }
    case "double_detector":
      return (tile) => !tile.cut && tile.color === "blue" && typeof tile.gameValue === "number";
    case "label_eq":
      if (mode.secondTileIndex !== null) return () => false;
      if (mode.firstTileIndex === null) {
        return (tile) => !(hasXRestriction && tile.isXMarked);
      }
      return (tile, idx) => {
        const firstTile = me.hand[mode.firstTileIndex!];
        if (!firstTile) return false;
        if (hasXRestriction && (firstTile.isXMarked || tile.isXMarked)) return false;
        if (!areFlatIndicesAdjacentWithinStand(me, mode.firstTileIndex!, idx)) return false;
        return isLabelEqual(firstTile, tile);
      };
    case "label_neq":
      if (mode.secondTileIndex !== null) return () => false;
      if (mode.firstTileIndex === null) {
        return (tile) => !(hasXRestriction && tile.isXMarked);
      }
      return (tile, idx) => {
        const firstTile = me.hand[mode.firstTileIndex!];
        if (!firstTile) return false;
        if (hasXRestriction && (firstTile.isXMarked || tile.isXMarked)) return false;
        if (!areFlatIndicesAdjacentWithinStand(me, mode.firstTileIndex!, idx)) return false;
        if (isLabelEqual(firstTile, tile)) return false;
        return !(firstTile.cut && tile.cut);
      };
    case "talkies_walkies":
      return (tile) => !tile.cut && !(hasXRestriction && tile.isXMarked);
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
    case "talkies_walkies":
      return undefined;
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
    case "post_it":
      return mode.selectedTileIndex ?? undefined;
    case "single_wire_label":
      return mode.selectedTileIndex ?? undefined;
    case "double_detector":
      return mode.guessTileIndex ?? undefined;
    case "label_eq":
    case "label_neq":
      return undefined;
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
  if (mode.kind === "label_eq" || mode.kind === "label_neq") {
    const indices: number[] = [];
    if (mode.firstTileIndex != null) indices.push(mode.firstTileIndex);
    if (mode.secondTileIndex != null) indices.push(mode.secondTileIndex);
    return indices.length > 0 ? indices : undefined;
  }
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
  targetPlayer?: ClientPlayer,
): EquipmentMode | null {
  if (!mode) return null;
  switch (mode.kind) {
    case "double_detector": {
      if (mode.targetPlayerId && mode.targetPlayerId !== oppId) return mode;
      let newTiles: number[] = mode.selectedTiles;
      if (mode.selectedTiles.includes(tileIndex)) {
        newTiles = mode.selectedTiles.filter((i) => i !== tileIndex);
      } else if (mode.selectedTiles.length < 2) {
        if (
          mode.selectedTiles.length > 0 &&
          targetPlayer &&
          !areFlatIndicesOnSameStand(targetPlayer, mode.selectedTiles[0]!, tileIndex)
        ) {
          return mode;
        }
        newTiles = [...mode.selectedTiles, tileIndex];
      }
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
      let newTiles: number[] = mode.targetTileIndices;
      if (mode.targetTileIndices.includes(tileIndex)) {
        newTiles = mode.targetTileIndices.filter((i) => i !== tileIndex);
      } else if (mode.targetTileIndices.length < 3) {
        if (
          mode.targetTileIndices.length > 0 &&
          targetPlayer &&
          !areFlatIndicesOnSameStand(
            targetPlayer,
            mode.targetTileIndices[0]!,
            tileIndex,
          )
        ) {
          return mode;
        }
        newTiles = [...mode.targetTileIndices, tileIndex];
      }
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
      return {
        ...mode,
        targetPlayerId: oppId,
        targetTileIndex: tileIndex,
        receiverStandIndex: mode.receiverStandIndex,
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
  gameState?: PostItMissionContext,
): OwnTileClickResult {
  if (!mode || !me) return { newMode: mode };
  const tile = me.hand[tileIndex];
  const hasXRestriction = gameState?.mission != null
    && hasXMarkedWireTalkiesRestriction(gameState.mission);
  const allowCutTile =
    (mode.kind === "post_it" && canPostItTargetCutWire(gameState))
    || mode.kind === "label_eq"
    || mode.kind === "label_neq"
    || mode.kind === "single_wire_label";
  if (!tile || (tile.cut && !allowCutTile)) return { newMode: mode };

  switch (mode.kind) {
    case "post_it": {
      if (tile.color !== "blue" || typeof tile.gameValue !== "number") return { newMode: mode };
      if (me.infoTokens.some((t) => t.position === tileIndex)) return { newMode: mode };
      const selectedTileIndex = mode.selectedTileIndex ?? null;
      if (selectedTileIndex === tileIndex) {
        return { newMode: { ...mode, selectedTileIndex: null } };
      }
      return {
        newMode: { ...mode, selectedTileIndex: tileIndex },
      };
    }
    case "single_wire_label": {
      if (tile.color !== "blue" || typeof tile.gameValue !== "number") return { newMode: mode };
      if (me.infoTokens.some((t) => t.position === tileIndex && t.singleWire)) return { newMode: mode };
      const singleCount = me.hand.filter(
        (t) => t.color === "blue" && t.gameValue === tile.gameValue,
      ).length;
      if (singleCount !== 1) return { newMode: mode };
      const curSelected = mode.selectedTileIndex ?? null;
      if (curSelected === tileIndex) {
        return { newMode: { ...mode, selectedTileIndex: null } };
      }
      return { newMode: { ...mode, selectedTileIndex: tileIndex } };
    }
    case "double_detector": {
      if (tile.color !== "blue" || typeof tile.gameValue !== "number") return { newMode: mode };
      if (mode.guessTileIndex === tileIndex) return { newMode: { ...mode, guessTileIndex: null } };
      return { newMode: { ...mode, guessTileIndex: tileIndex } };
    }
    case "label_eq": {
      if (hasXRestriction && tile.isXMarked) return { newMode: mode };
      if (mode.firstTileIndex === null) {
        return { newMode: { ...mode, firstTileIndex: tileIndex } };
      }
      if (tileIndex === mode.firstTileIndex) {
        return { newMode: { ...mode, firstTileIndex: null, secondTileIndex: null } };
      }
      if (tileIndex === mode.secondTileIndex) {
        return { newMode: { ...mode, secondTileIndex: null } };
      }
      if (mode.secondTileIndex !== null) return { newMode: mode };
      const firstTile = me.hand[mode.firstTileIndex];
      if (!firstTile) return { newMode: mode };
      if (hasXRestriction && firstTile.isXMarked) return { newMode: mode };
      if (!areFlatIndicesAdjacentWithinStand(me, tileIndex, mode.firstTileIndex)) {
        return { newMode: mode };
      }
      if (!isLabelEqual(firstTile, tile)) return { newMode: mode };
      return { newMode: { ...mode, secondTileIndex: tileIndex } };
    }
    case "label_neq": {
      if (hasXRestriction && tile.isXMarked) return { newMode: mode };
      if (mode.firstTileIndex === null) {
        return { newMode: { ...mode, firstTileIndex: tileIndex } };
      }
      if (tileIndex === mode.firstTileIndex) {
        return { newMode: { ...mode, firstTileIndex: null, secondTileIndex: null } };
      }
      if (tileIndex === mode.secondTileIndex) {
        return { newMode: { ...mode, secondTileIndex: null } };
      }
      if (mode.secondTileIndex !== null) return { newMode: mode };
      if (!areFlatIndicesAdjacentWithinStand(me, tileIndex, mode.firstTileIndex)) {
        return { newMode: mode };
      }
      const firstTile = me.hand[mode.firstTileIndex];
      if (!firstTile) return { newMode: mode };
      if (hasXRestriction && firstTile.isXMarked) return { newMode: mode };
      if (isLabelEqual(firstTile, tile)) return { newMode: mode };
      if (firstTile.cut && tile.cut) return { newMode: mode };
      return { newMode: { ...mode, secondTileIndex: tileIndex } };
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
