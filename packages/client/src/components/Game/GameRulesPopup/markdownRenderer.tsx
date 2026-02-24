import type { InlineToken, ListItem, BodyNode, MarkdownSection } from "./markdownParser.js";

// ── Inline rendering ───────────────────────────────────────────────

function InlineTokens({ tokens }: { tokens: InlineToken[] }) {
  return (
    <>
      {tokens.map((t, i) => {
        switch (t.kind) {
          case "bold":
            return (
              <strong key={i} className="font-bold text-gray-100">
                {t.value}
              </strong>
            );
          case "code":
            return (
              <code
                key={i}
                className="rounded bg-gray-800 px-1 py-0.5 font-mono text-amber-300"
              >
                {t.value}
              </code>
            );
          case "text":
            return <span key={i}>{t.value}</span>;
        }
      })}
    </>
  );
}

// ── List rendering ─────────────────────────────────────────────────

function ListItemNode({ item }: { item: ListItem }) {
  return (
    <li>
      <InlineTokens tokens={item.tokens} />
      {item.children.length > 0 && (
        <ul className="ml-4 mt-1 list-disc space-y-1">
          {item.children.map((child, i) => (
            <ListItemNode key={i} item={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

// ── Body node rendering ────────────────────────────────────────────

function BodyNodeView({ node }: { node: BodyNode }) {
  switch (node.kind) {
    case "paragraph":
      return (
        <p className="text-xs leading-relaxed text-gray-300">
          <InlineTokens tokens={node.tokens} />
        </p>
      );
    case "unordered-list":
      return (
        <ul className="ml-4 list-disc space-y-1 text-xs leading-relaxed text-gray-300">
          {node.items.map((item, i) => (
            <ListItemNode key={i} item={item} />
          ))}
        </ul>
      );
    case "ordered-list":
      return (
        <ol className="ml-4 list-decimal space-y-1 text-xs leading-relaxed text-gray-300">
          {node.items.map((item, i) => (
            <ListItemNode key={i} item={item} />
          ))}
        </ol>
      );
    case "blockquote":
      return (
        <blockquote className="border-l-2 border-amber-500/50 pl-3 text-xs italic leading-relaxed text-gray-400">
          <InlineTokens tokens={node.tokens} />
        </blockquote>
      );
    case "hr":
      return <hr className="border-gray-700" />;
  }
}

// ── Section rendering ──────────────────────────────────────────────

export function SectionView({ section }: { section: MarkdownSection }) {
  return (
    <section className="space-y-2">
      {section.heading.level === 2 ? (
        <h2
          id={section.heading.id}
          className="scroll-mt-4 border-b border-gray-700 pb-1 text-base font-black uppercase tracking-wide text-gray-100"
        >
          {section.heading.text}
        </h2>
      ) : section.heading.level === 3 ? (
        <h3
          id={section.heading.id}
          className="scroll-mt-4 text-sm font-bold text-gray-200"
        >
          {section.heading.text}
        </h3>
      ) : (
        <h4
          id={section.heading.id}
          className="scroll-mt-4 text-xs font-semibold text-gray-300"
        >
          {section.heading.text}
        </h4>
      )}

      {section.body.map((node, i) => (
        <BodyNodeView key={i} node={node} />
      ))}

      {section.subsections.map((sub) => (
        <div key={sub.heading.id} className="ml-2 space-y-2 pt-1">
          <SectionView section={sub} />
        </div>
      ))}
    </section>
  );
}
