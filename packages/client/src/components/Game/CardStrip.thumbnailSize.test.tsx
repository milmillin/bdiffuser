import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { makeEquipmentCard } from "@bomb-busters/shared/testing";
import { CardStrip } from "./CardStrip.js";

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function classesForTestId(html: string, testId: string): string[] {
  const pattern = new RegExp(
    `data-testid="${escapeForRegExp(testId)}"[^>]*class="([^"]+)"`,
  );
  const match = html.match(pattern);
  expect(match).not.toBeNull();
  return (match?.[1] ?? "").split(/\s+/).filter(Boolean);
}

describe("CardStrip thumbnail sizing", () => {
  it("renders equipment thumbnails at 1.5x width", () => {
    const html = renderToStaticMarkup(
      <CardStrip
        equipment={[
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 6,
            faceDown: false,
            unlocked: true,
            used: false,
          }),
        ]}
        character={null}
        isMyTurn={true}
        canSelectCards={true}
        selectedCardId={null}
        onSelectEquipmentAction={vi.fn(() => true)}
      />,
    );

    const classes = classesForTestId(html, "card-strip-thumb-equipment-rewinder");
    expect(classes).toEqual(
      expect.arrayContaining(["w-[13.5rem]", "sm:w-[15rem]", "shrink-0"]),
    );
  });
});
