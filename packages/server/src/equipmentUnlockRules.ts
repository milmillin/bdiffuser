import type { EquipmentCard } from "@bomb-busters/shared";

const DOUBLE_NUMBER_CAMPAIGN_EQUIPMENT_IDS = new Set<string>([
  "single_wire_label",
  "emergency_drop",
  "fast_pass",
  "disintegrator",
  "grappling_hook",
]);

/**
 * Campaign "double-number" equipment (22/33/99/10-10/11-11) unlock at 4 cuts.
 * All other equipment cards use the default 2-cut unlock threshold.
 */
export function getEquipmentUnlockCutsRequiredById(equipmentId: string): number {
  return DOUBLE_NUMBER_CAMPAIGN_EQUIPMENT_IDS.has(equipmentId) ? 4 : 2;
}

export function getEquipmentUnlockCutsRequired(
  equipment: Pick<EquipmentCard, "id">,
): number {
  return getEquipmentUnlockCutsRequiredById(equipment.id);
}
