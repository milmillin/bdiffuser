import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { makeEquipmentCard } from "@bomb-busters/shared/testing";
import { CardStrip } from "./CardStrip.js";

function renderCardStrip(
  equipment: ReturnType<typeof makeEquipmentCard>[],
  options: {
    equipmentUsageLocked?: boolean;
  } = {},
): string {
  return renderToStaticMarkup(
    <CardStrip
      equipment={equipment}
      character={null}
      isMyTurn={true}
      canSelectCards={true}
      selectedCardId={null}
      onSelectEquipmentAction={vi.fn(() => true)}
      equipmentUsageLocked={options.equipmentUsageLocked}
    />,
  );
}

describe("CardStrip equipment status", () => {
  it("shows face-down equipment as locked even when unlocked flag is true", () => {
    const html = renderCardStrip([
      makeEquipmentCard({
        id: "rewinder",
        name: "Rewinder",
        unlockValue: 6,
        faceDown: true,
        unlocked: true,
        used: false,
      }),
    ]);

    expect(html).toContain(">Face Down<");
    expect(html).not.toContain(">Available<");
  });

  it("shows available only when equipment is face-up and unlocked", () => {
    const html = renderCardStrip([
      makeEquipmentCard({
        id: "rewinder",
        name: "Rewinder",
        unlockValue: 6,
        faceDown: false,
        unlocked: true,
        used: false,
      }),
    ]);

    expect(html).toContain(">Available<");
    expect(html).not.toContain(">Face Down<");
  });

  it("shows locked when actor-level equipment lock is active", () => {
    const html = renderCardStrip(
      [
        makeEquipmentCard({
          id: "rewinder",
          name: "Rewinder",
          unlockValue: 6,
          faceDown: false,
          unlocked: true,
          used: false,
        }),
      ],
      { equipmentUsageLocked: true },
    );

    expect(html).toContain(">Locked<");
    expect(html).not.toContain(">Available<");
  });
});
