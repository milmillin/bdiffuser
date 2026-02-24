import { describe, expect, it } from "vitest";

declare global {
  interface ImportMeta {
    glob: (
      pattern: string,
      options?: { eager?: boolean; query?: string; import?: string },
    ) => Record<string, string>;
  }
}

describe("game log writes", () => {
  it("uses pushGameLog helper instead of direct log.push in server sources", () => {
    const sources = import.meta.glob("../**/*.ts", {
      eager: true,
      query: "?raw",
      import: "default",
    });

    const directPushPattern =
      /\b(?:state|ctx\.state|this\.room\.gameState)\.log\.push\(/;

    const violations = Object.entries(sources)
      .filter(([path]) =>
        !path.endsWith("/gameLog.ts")
        && !path.endsWith(".test.ts")
        && directPushPattern.test(sources[path]),
      )
      .map(([path]) => path);

    expect(violations).toEqual([]);
  });
});
