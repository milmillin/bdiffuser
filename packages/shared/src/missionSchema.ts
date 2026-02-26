import {
  PLAYER_COUNTS,
  buildSourceRef,
  defaultDifficulty,
  defaultSetup,
} from "./missionSchemaBuilders.js";
import { registerEarlyCampaignMissions } from "./missionData/earlyCampaign.js";
import { registerExpansionAMissions } from "./missionData/expansionA.js";
import { registerExpansionBMissions } from "./missionData/expansionB.js";
import { registerExpansionCMissions } from "./missionData/expansionC.js";
import { registerExpertCampaignMissions } from "./missionData/expertCampaign.js";
import { registerLateCampaignMissions } from "./missionData/lateCampaign.js";
import { registerMidCampaignMissions } from "./missionData/midCampaign.js";
import { registerTrainingMissions } from "./missionData/training.js";
import { validateMissionSchemas } from "./missionSchemaValidation.js";
import type {
  MissionEquipmentSpec,
  MissionRuleSchema,
  MissionSetupSpec,
  PlayerCount,
  ResolvedMissionSetup,
} from "./missionSchemaTypes.js";
import { ALL_MISSION_IDS, type MissionId } from "./types.js";
export type {
  AddSubtractNumberCardsRuleDef,
  AudioPromptRuleDef,
  BlueAsRedRuleDef,
  BlueWireSpec,
  BossDesignatesValueRuleDef,
  CaptainLazyConstraintsRuleDef,
  ConstraintEnforcementRuleDef,
  CountTokensRuleDef,
  Mission57ConstraintPerValidatedValueRuleDef,
  DynamicTurnOrderRuleDef,
  EquipmentDoubleLockRuleDef,
  EvenOddTokensRuleDef,
  ChallengeRewardsRuleDef,
  FalseInfoTokensRuleDef,
  FalseTokensRuleDef,
  ForcedGeneralRadarFlowRuleDef,
  HiddenEquipmentPileRuleDef,
  HiddenNumberCardPenaltyRuleDef,
  IberianYellowModeRuleDef,
  InternFailureExplodesRuleDef,
  BunkerFlowRuleDef,
  NanoProgressionRuleDef,
  NanoValueParityRuleDef,
  NoCharacterCardsRuleDef,
  NoInfoUnlimitedDDRuleDef,
  NoMarkersMemoryModeRuleDef,
  NoSpokenNumbersRuleDef,
  NumberCardCompletionsRuleDef,
  NumberDeckEquipmentRevealRuleDef,
  OxygenProgressionRuleDef,
  PersonalNumberCardsRuleDef,
  MissionDifficulty,
  MissionEquipmentSpec,
  MissionHookRuleDef,
  MissionRuleSchema,
  MissionSetupSpec,
  MissionSourceRef,
  PlayerCount,
  RandomSetupInfoTokensRuleDef,
  ResolvedMissionSetup,
  SequenceCardRepositionRuleDef,
  SequencePriorityRuleDef,
  SevensLastRuleDef,
  SimultaneousFourCutRuleDef,
  SimultaneousMultiCutRuleDef,
  SqueakNumberChallengeRuleDef,
  TimerRuleDef,
  UpsideDownWireRuleDef,
  VisibleNumberCardGateRuleDef,
  WirePoolSpec,
  XMarkedWireRuleDef,
  YellowTriggerTokenPassRuleDef,
} from "./missionSchemaTypes.js";
export { describeWirePoolSpec, getWirePoolCount } from "./missionSchemaUtils.js";

const schemas = {} as Record<MissionId, MissionRuleSchema>;
for (const id of ALL_MISSION_IDS) {
  schemas[id] = {
    id,
    name: `Mission ${id}`,
    difficulty: defaultDifficulty(id),
    setup: defaultSetup(),
    allowedPlayerCounts: PLAYER_COUNTS,
    sourceRef: buildSourceRef(id),
  } satisfies MissionRuleSchema;
}

function setMission(id: MissionId, patch: Omit<Partial<MissionRuleSchema>, "id">): void {
  schemas[id] = {
    ...schemas[id],
    ...patch,
    setup: patch.setup ?? schemas[id].setup,
    overrides: patch.overrides ?? schemas[id].overrides,
    allowedPlayerCounts: patch.allowedPlayerCounts ?? schemas[id].allowedPlayerCounts,
  };
}

registerTrainingMissions(setMission);
registerEarlyCampaignMissions(setMission);
registerMidCampaignMissions(setMission);
registerLateCampaignMissions(setMission);
registerExpertCampaignMissions(setMission);
registerExpansionAMissions(setMission);
registerExpansionBMissions(setMission);
registerExpansionCMissions(setMission);

export const MISSION_SCHEMAS: Record<MissionId, MissionRuleSchema> = schemas;

function mergeEquipment(
  base: MissionEquipmentSpec,
  override?: MissionSetupSpec["equipment"],
): MissionEquipmentSpec {
  if (!override) return base;
  return {
    ...base,
    ...override,
  };
}

export function resolveMissionSetup(
  missionId: MissionId,
  playerCount: number,
): ResolvedMissionSetup {
  const mission = MISSION_SCHEMAS[missionId];
  if (!mission) {
    throw new Error(`Missing mission schema for mission ${missionId}`);
  }

  const count = playerCount as PlayerCount;
  if (mission.allowedPlayerCounts && !mission.allowedPlayerCounts.includes(count)) {
    throw new Error(
      `Mission ${missionId} is not available for ${playerCount} players`,
    );
  }

  const override = mission.overrides?.[count];
  const setup: MissionSetupSpec = {
    blue: override?.blue ?? mission.setup.blue,
    red: override?.red ?? mission.setup.red,
    yellow: override?.yellow ?? mission.setup.yellow,
    equipment: mergeEquipment(mission.setup.equipment, override?.equipment),
  };

  return { mission, setup };
}

export function hasXMarkedWireTalkiesRestriction(missionId: MissionId): boolean {
  return MISSION_SCHEMAS[missionId].hookRules?.some(
    (rule) =>
      rule.kind === "x_marked_wire" &&
      rule.excludeWalkieTalkies === true,
  ) ?? false;
}

validateMissionSchemas(MISSION_SCHEMAS, mergeEquipment);
