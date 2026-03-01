export type DualCutPendingActionLike = {
  kind: "dual_cut";
  mission59RotateNano?: boolean;
  mission43NanoStandIndex?: number;
};

export type DualCutDraftReset = {
  pendingAction: null;
  selectedGuessTile: number;
  mission59RotateNano: boolean;
  mission43NanoStandIndex: number;
};

/**
 * When an already-staged dual cut changes actor wire, return to draft mode.
 * This clears the staged target so the user must choose the target wire again.
 */
export function resetDualCutToDraft(
  pendingAction: DualCutPendingActionLike,
  newActorTileIndex: number,
): DualCutDraftReset {
  return {
    pendingAction: null,
    selectedGuessTile: newActorTileIndex,
    mission59RotateNano: pendingAction.mission59RotateNano ?? false,
    mission43NanoStandIndex: pendingAction.mission43NanoStandIndex ?? 0,
  };
}
