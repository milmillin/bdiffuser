// ---------------------------------------------------------------------------
// Lightweight markdown parser for GAME_RULES.md
//
// The rules file uses a very predictable subset of markdown:
//   - ## / ### headings
//   - Unordered lists (- item) with nesting (2-space indent)
//   - Ordered lists (1. item)
//   - Blockquotes (> lines)
//   - Horizontal rules (---)
//   - Inline: **bold**, `code`
//
// We parse into a section tree so the rest of the app can filter / render
// without external dependencies.
// ---------------------------------------------------------------------------

/** Inline token types. */
export type InlineToken =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "code"; value: string };

export interface ListItem {
  tokens: InlineToken[];
  children: ListItem[];
  redacted?: boolean;
}

export type BodyNode =
  | { kind: "paragraph"; tokens: InlineToken[] }
  | { kind: "unordered-list"; items: ListItem[] }
  | { kind: "ordered-list"; items: ListItem[] }
  | { kind: "blockquote"; tokens: InlineToken[] }
  | { kind: "hr" };

export interface SectionHeading {
  level: 2 | 3 | 4;
  text: string;
  id: string;
}

export interface MarkdownSection {
  heading: SectionHeading;
  body: BodyNode[];
  subsections: MarkdownSection[];
  redacted?: boolean;
}

// ── Inline tokenizer ───────────────────────────────────────────────

const INLINE_RE = /(\*\*[^*]+\*\*|`[^`]+`)/;

export function tokenizeInline(raw: string): InlineToken[] {
  const parts = raw.split(INLINE_RE);
  const tokens: InlineToken[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("**") && part.endsWith("**")) {
      tokens.push({ kind: "bold", value: part.slice(2, -2) });
    } else if (part.startsWith("`") && part.endsWith("`")) {
      tokens.push({ kind: "code", value: part.slice(1, -1) });
    } else {
      tokens.push({ kind: "text", value: part });
    }
  }
  return tokens;
}

// ── Heading slug ───────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ── Line-level helpers ─────────────────────────────────────────────

function headingLevel(line: string): 2 | 3 | 4 | 0 {
  if (line.startsWith("#### ")) return 4;
  if (line.startsWith("### ")) return 3;
  if (line.startsWith("## ")) return 2;
  return 0;
}

function headingText(line: string): string {
  return line.replace(/^#{2,4}\s+/, "");
}

function isHr(line: string): boolean {
  return /^---+\s*$/.test(line);
}

function isBlockquoteLine(line: string): boolean {
  return line.startsWith("> ");
}

function blockquoteContent(line: string): string {
  return line.slice(2);
}

function isUnorderedListItem(line: string): boolean {
  return /^(\s*)- /.test(line);
}

function isOrderedListItem(line: string): boolean {
  return /^\d+\.\s/.test(line);
}

function listItemIndent(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

function listItemText(line: string): string {
  return line.replace(/^\s*-\s+/, "").replace(/^\d+\.\s+/, "");
}

// ── List item parser (handles nesting) ─────────────────────────────

function parseListItems(
  lines: string[],
  startIdx: number,
  baseIndent: number,
): { items: ListItem[]; consumed: number } {
  const items: ListItem[] = [];
  let i = startIdx;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) break;

    const indent = listItemIndent(line);
    const isList = isUnorderedListItem(line) || isOrderedListItem(line);

    if (isList && indent < baseIndent) break;

    if (isList && indent === baseIndent) {
      const item: ListItem = {
        tokens: tokenizeInline(listItemText(line)),
        children: [],
      };
      i++;

      // Collect continuation lines (indented non-list lines at deeper indent)
      while (i < lines.length) {
        const nextLine = lines[i];
        if (!nextLine.trim()) break;

        const nextIndent = listItemIndent(nextLine);
        const nextIsList =
          isUnorderedListItem(nextLine) || isOrderedListItem(nextLine);

        if (nextIsList && nextIndent > baseIndent) {
          // Nested list
          const nested = parseListItems(lines, i, nextIndent);
          item.children.push(...nested.items);
          i += nested.consumed;
        } else if (!nextIsList && nextIndent > baseIndent) {
          // Continuation line — append text to current item
          item.tokens.push(
            { kind: "text", value: " " },
            ...tokenizeInline(nextLine.trim()),
          );
          i++;
        } else {
          break;
        }
      }

      items.push(item);
    } else {
      break;
    }
  }

  return { items, consumed: i - startIdx };
}

// ── Body parser (between headings) ─────────────────────────────────

function parseBody(lines: string[]): BodyNode[] {
  const nodes: BodyNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Horizontal rule
    if (isHr(line)) {
      nodes.push({ kind: "hr" });
      i++;
      continue;
    }

    // Blockquote (merge consecutive > lines)
    if (isBlockquoteLine(line)) {
      const parts: string[] = [];
      while (i < lines.length && isBlockquoteLine(lines[i])) {
        parts.push(blockquoteContent(lines[i]));
        i++;
      }
      nodes.push({ kind: "blockquote", tokens: tokenizeInline(parts.join(" ")) });
      continue;
    }

    // Unordered list
    if (isUnorderedListItem(line)) {
      const indent = listItemIndent(line);
      const { items, consumed } = parseListItems(lines, i, indent);
      nodes.push({ kind: "unordered-list", items });
      i += consumed;
      continue;
    }

    // Ordered list
    if (isOrderedListItem(line)) {
      const { items, consumed } = parseListItems(lines, i, 0);
      nodes.push({ kind: "ordered-list", items });
      i += consumed;
      continue;
    }

    // Paragraph (collect consecutive non-special lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !isHr(lines[i]) &&
      !isBlockquoteLine(lines[i]) &&
      !isUnorderedListItem(lines[i]) &&
      !isOrderedListItem(lines[i]) &&
      headingLevel(lines[i]) === 0
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      nodes.push({
        kind: "paragraph",
        tokens: tokenizeInline(paraLines.join(" ")),
      });
    }
  }

  return nodes;
}

// ── Top-level parser ───────────────────────────────────────────────

/**
 * Parses a GAME_RULES.md string into a flat array of ## sections,
 * each containing ### subsections.
 */
export function parseMarkdown(raw: string): MarkdownSection[] {
  const lines = raw.split("\n");
  const sections: MarkdownSection[] = [];

  // Skip the initial `# ` title line — it's a single h1 we don't display.
  let i = 0;
  while (i < lines.length && headingLevel(lines[i]) !== 2) i++;

  while (i < lines.length) {
    const lvl = headingLevel(lines[i]);
    if (lvl !== 2) {
      i++;
      continue;
    }

    const text = headingText(lines[i]);
    const section: MarkdownSection = {
      heading: { level: 2, text, id: slugify(text) },
      body: [],
      subsections: [],
    };
    i++;

    // Collect body lines and ### subsections until next ##
    const bodyLines: string[] = [];

    while (i < lines.length && headingLevel(lines[i]) !== 2) {
      if (headingLevel(lines[i]) === 3) {
        // Flush pending body lines into section.body
        if (bodyLines.length > 0) {
          section.body.push(...parseBody(bodyLines));
          bodyLines.length = 0;
        }

        const subText = headingText(lines[i]);
        const sub: MarkdownSection = {
          heading: { level: 3, text: subText, id: slugify(subText) },
          body: [],
          subsections: [],
        };
        i++;

        const subBody: string[] = [];
        while (
          i < lines.length &&
          headingLevel(lines[i]) !== 2 &&
          headingLevel(lines[i]) !== 3
        ) {
          if (headingLevel(lines[i]) === 4) {
            // Flush pending body lines into sub.body
            if (subBody.length > 0) {
              sub.body.push(...parseBody(subBody));
              subBody.length = 0;
            }

            const h4Text = headingText(lines[i]);
            const h4Section: MarkdownSection = {
              heading: { level: 4, text: h4Text, id: slugify(h4Text) },
              body: [],
              subsections: [],
            };
            i++;

            const h4Body: string[] = [];
            while (
              i < lines.length &&
              headingLevel(lines[i]) !== 2 &&
              headingLevel(lines[i]) !== 3 &&
              headingLevel(lines[i]) !== 4
            ) {
              h4Body.push(lines[i]);
              i++;
            }
            h4Section.body = parseBody(h4Body);
            sub.subsections.push(h4Section);
          } else {
            subBody.push(lines[i]);
            i++;
          }
        }
        if (subBody.length > 0) {
          sub.body.push(...parseBody(subBody));
        }
        section.subsections.push(sub);
      } else {
        bodyLines.push(lines[i]);
        i++;
      }
    }

    // Flush any remaining body lines
    if (bodyLines.length > 0) {
      section.body.push(...parseBody(bodyLines));
    }

    sections.push(section);
  }

  return sections;
}
