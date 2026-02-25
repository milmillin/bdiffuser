import { describe, expect, it } from "vitest";

import { parseMarkdown } from "./markdownParser.js";
import type { InlineToken } from "./markdownParser.js";

describe("markdownParser", () => {
  it("parses nested ordered list items with indentation", () => {
    const sections = parseMarkdown(`
## Mission 46
1. Cut one of your blue wires.
  1. If possible, keep the order.
  2. Otherwise, continue.
2. Then cut one red wire.
`);

    const body = sections[0].body;
    const top = body[0];
    expect(top.kind).toBe("ordered-list");
    if (top.kind !== "ordered-list") {
      throw new Error("Expected ordered list");
    }
    expect(top.items).toHaveLength(2);

    const first = top.items[0];
    expect(first.tokens.map((t: InlineToken) => t.value).join("")).toBe(
      "Cut one of your blue wires.",
    );
    expect(first.children).toHaveLength(2);
    expect(first.children[0].tokens.map((t: InlineToken) => t.value).join("")).toBe(
      "If possible, keep the order.",
    );
    expect(first.children[1].tokens.map((t: InlineToken) => t.value).join("")).toBe(
      "Otherwise, continue.",
    );
  });
});
