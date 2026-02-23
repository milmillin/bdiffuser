/**
 * Maps equipment string IDs (from game state) to the label used in GAME_RULES.md.
 *
 * GAME_RULES.md uses numbered references like "Equipment `1`" for base cards
 * and special labels like "Yellow equipment" or "Equipment `22`" for campaign cards.
 */
export const EQUIPMENT_ID_TO_RULES_LABEL: Record<string, string> = {
  // Base equipment (1-12)
  label_neq: "1",
  talkies_walkies: "2",
  triple_detector: "3",
  post_it: "4",
  super_detector: "5",
  rewinder: "6",
  emergency_batteries: "7",
  general_radar: "8",
  stabilizer: "9",
  x_or_y_ray: "10",
  coffee_thermos: "11",
  label_eq: "12",
  // Campaign equipment
  double_fond: "Yellow equipment",
  single_thread_label: "22",
  emergency_fund: "33",
  thread_cutter: "99",
  disintegrator: "10-10",
  grapple: "11-11",
};
