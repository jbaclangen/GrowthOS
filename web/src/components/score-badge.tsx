export function scoreTone(score: number) {
  return score >= 70 ? "text-success" : score >= 45 ? "text-warning" : "text-danger";
}

export function ScoreBadge({ score, size = "lg" }: { score: number | null; size?: "sm" | "lg" }) {
  const dims = size === "lg" ? "h-28 w-28 text-4xl" : "h-14 w-14 text-lg";
  return (
    <div
      className={`flex shrink-0 flex-col items-center justify-center rounded-full border-4 border-current ${dims} ${
        score == null ? "text-border" : scoreTone(score)
      }`}
      aria-label={score == null ? "Not scored yet" : `Growth score ${score} out of 100`}
    >
      <span className="font-semibold text-foreground tabular-nums">{score ?? "–"}</span>
      {size === "lg" && <span className="text-xs text-muted">/ 100</span>}
    </div>
  );
}

export function ScoreBar({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>
          {label}
          {note && <span className="ml-1 text-xs text-muted">{note}</span>}
        </span>
        <span className={`font-medium tabular-nums ${scoreTone(value)}`}>{value}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-background">
        <div className="h-1.5 rounded-full bg-accent" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
