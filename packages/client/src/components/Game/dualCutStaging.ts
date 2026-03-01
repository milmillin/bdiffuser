export type DualCutPendingActionLike = {
  kind: "dual_cut";
  mission59RotateNano?: boolean;
};

export type DualCutDraftReset = {
  pendingAction: null;
  selectedGuessTile: number;
  mission59RotateNano: boolean;
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
  };
}
