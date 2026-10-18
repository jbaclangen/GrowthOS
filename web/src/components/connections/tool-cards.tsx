import type { ToolSuggestion } from "@/lib/integrations/tool-catalog";

// Coming-soon tools on the onboarding step "Connect your tools" and in Settings → Connections (D-041). Presentational:
// no buttons or links, because none of these can be connected yet (claim rules, VOICE_AND_MESSAGING §5).

export function ToolCardList({
  items,
  headingLevel = 3,
  nested = false,
}: {
  items: ToolSuggestion[];
  headingLevel?: 3 | 4;
  // Inside another card (Settings): a bordered box instead of a second card.
  nested?: boolean;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h4";
  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
      {items.map(({ tool, suggested, reasons }) => (
        <li key={tool.id} className={nested ? "rounded-md border border-border p-4" : "card"}>
          {/* Heading first, then its chips, as on the Search Console card: moving by headings lands before the status. */}
          <div className="flex flex-wrap items-center gap-2">
            <Heading className="text-base font-semibold">{tool.name}</Heading>
            <span className="chip bg-accent-soft text-accent-soft-foreground">Pro</span>
            <span className="chip bg-surface-muted text-muted">Coming soon</span>
            {suggested && <span className="chip bg-surface-muted text-muted">Suggested</span>}
          </div>
          <p className="mt-1 text-sm text-muted">{tool.helps}</p>
          {reasons.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-sm">
              {reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted">There&apos;s nothing to connect yet.</p>
        </li>
      ))}
    </ul>
  );
}
