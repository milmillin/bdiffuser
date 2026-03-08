export interface NumberCardDef {
  value: number;
  /**
   * Mission 62 setup: the detonator starts this many spaces before
   * explosion. The printed Number cards all indicate one step from loss.
   */
  mission62StartingDetonatorDistanceFromLoss: number;
}

export const NUMBER_CARD_DEFS: readonly NumberCardDef[] = Array.from(
  { length: 12 },
  (_unused, index) => ({
    value: index + 1,
    mission62StartingDetonatorDistanceFromLoss: 1,
  }),
);

const NUMBER_CARD_DEF_BY_VALUE = new Map(
  NUMBER_CARD_DEFS.map((card) => [card.value, card] as const),
);

export function getNumberCardDef(value: number): NumberCardDef | undefined {
  return NUMBER_CARD_DEF_BY_VALUE.get(value);
}
