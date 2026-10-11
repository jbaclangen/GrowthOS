import Link from "next/link";
import {
  PROVENANCE_LABEL,
  capability,
  orderPlan,
  painPointLabel,
  scoreExplanation,
  type Level,
  type Provenance,
} from "@/lib/plan/priority";
import { DiagnosisActions, FindingReview, PlanItemActions } from "./plan-controls";

export type DiagnosisRow = {
  id: string;
  status: "proposed" | "confirmed" | "superseded";
  summary: string;
  missing_info: string[];
  version: number;
  confirmed_at: string | null;
};
export type FindingRow = {
  id: string;
  position: number;
  statement: string;
  evidence: string;
  provenance: Provenance;
  confidence: Level;
  owner_verdict: "pending" | "confirmed" | "rejected";
  owner_note: string | null;
};
export type PlanItemRow = {
  id: string;
  title: string;
  area: string;
  pain_point_ids: string[];
  finding_positions: number[];
  why: string;
  first_action: string;
  dependencies: string;
  success_metric: string;
  solution_ids: string[];
  manual_alternative: string;
  impact: number;
  urgency: number;
  urgency_from_owner: boolean;
  effort: number;
  confidence: Level;
  customer_priority: number | null;
  ai_priority: number;
  calculated_priority: number;
  final_priority: number | null;
  status: "proposed" | "accepted" | "dismissed" | "done";
};

const PROVENANCE_TONE: Record<Provenance, string> = {
  verified: "bg-success-soft text-foreground",
  customer_provided: "bg-accent-soft text-accent-soft-foreground",
  inferred: "bg-surface-muted text-muted",
};
const CONFIDENCE_TEXT: Record<Level, string> = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };

function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`chip ${className}`}>{children}</span>;
}

// The plan in the order the owner sees it: confirmed order once confirmed, otherwise the proposed order.
export function sortedPlan(items: PlanItemRow[], confirmed: boolean) {
  return confirmed
    ? [...items].sort((a, b) => (a.final_priority ?? 99) - (b.final_priority ?? 99) || a.ai_priority - b.ai_priority)
    : orderPlan(items);
}

export function DiagnosisSection({
  diagnosis,
  findings,
  updating,
  replacesConfirmedOn,
}: {
  diagnosis: DiagnosisRow;
  findings: FindingRow[];
  updating: boolean;
  replacesConfirmedOn: string | null;
}) {
  const proposed = diagnosis.status === "proposed";
  const hasCorrections = findings.some((f) => f.owner_verdict === "rejected");

  return (
    <section id="diagnosis" className={`card scroll-mt-6 ${proposed ? "border-accent" : ""}`} aria-labelledby="diagnosis-title">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="diagnosis-title" className="text-lg font-semibold">
          What&apos;s holding the business back
        </h2>
        {proposed ? (
          <Chip className="bg-warning-soft text-foreground">Needs your check</Chip>
        ) : (
          <Chip className="bg-success-soft text-foreground">Confirmed by you</Chip>
        )}
        {diagnosis.version > 1 && <span className="text-xs text-muted">Updated with your corrections</span>}
      </div>
      <p className="mt-2 text-sm">{diagnosis.summary}</p>
      {proposed && replacesConfirmedOn && (
        <p className="mt-2 text-xs text-muted">
          This is a new analysis. Confirming it replaces the plan you confirmed on {replacesConfirmedOn}.
        </p>
      )}

      <ol className="mt-4 space-y-4">
        {findings.map((f) => (
          <li key={f.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
            <div className="flex gap-2">
              <span className="text-sm font-semibold text-muted tabular-nums">{f.position}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{f.statement}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                  <Chip className={PROVENANCE_TONE[f.provenance]}>{PROVENANCE_LABEL[f.provenance]}</Chip>
                  <span>{CONFIDENCE_TEXT[f.confidence]}</span>
                </p>
                <p className="mt-1 text-xs text-muted">{f.evidence}</p>
                {proposed && !updating && (
                  <FindingReview findingId={f.id} verdict={f.owner_verdict} note={f.owner_note} />
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {diagnosis.missing_info.length > 0 && (
        <div className="mt-4 rounded-md bg-surface-muted p-3">
          <p className="text-sm font-medium">What we couldn&apos;t confirm</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-muted">
            {diagnosis.missing_info.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {updating ? (
        <p className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-sm" role="status">
          Updating the diagnosis and plan with your corrections. This takes about a minute.
        </p>
      ) : (
        proposed && <DiagnosisActions diagnosisId={diagnosis.id} hasCorrections={hasCorrections} />
      )}
    </section>
  );
}

export function PlanSection({ items, confirmed }: { items: PlanItemRow[]; confirmed: boolean }) {
  const plan = sortedPlan(items, confirmed);
  return (
    <section id="plan" className="scroll-mt-6">
      <h2 className="text-lg font-semibold">{confirmed ? "Your growth plan" : "Proposed growth plan"}</h2>
      <p className="text-sm text-muted">
        {confirmed
          ? "In the order you confirmed: your priorities first, then the highest-scoring actions."
          : "Your priorities come first, then the actions with the highest priority score. Confirm the diagnosis above to set it."}
      </p>
      <ol className="mt-3 space-y-3">
        {plan.map((item, i) => {
          const { available, notYet } = capability(item.solution_ids);
          const muted = item.status === "dismissed" || item.status === "done";
          return (
            <li key={item.id} className={`card ${muted ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-muted tabular-nums">{item.final_priority ?? i + 1}</span>
                <h3 className="font-medium">{item.title}</h3>
                {item.customer_priority && (
                  <Chip className="bg-accent-soft text-accent-soft-foreground">Your priority {item.customer_priority}</Chip>
                )}
              </div>
              {item.pain_point_ids.length > 0 && (
                <p className="mt-1 text-xs text-muted">
                  Addresses: {item.pain_point_ids.map((id) => painPointLabel(id)).join("; ")}
                </p>
              )}
              <p className="mt-2 whitespace-pre-line text-sm text-muted">{item.why}</p>
              <p className="mt-2 whitespace-pre-line text-sm">
                <span className="font-medium">First step: </span>
                {item.first_action}
              </p>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {item.success_metric && <Detail label="How you'll know it worked" value={item.success_metric} />}
                {item.dependencies && <Detail label="Needs first" value={item.dependencies} />}
                <Detail
                  label="Priority score"
                  value={`${item.calculated_priority} (${scoreExplanation(item)}${item.urgency_from_owner ? "; urgency from your answer" : ""})`}
                />
                {item.finding_positions.length > 0 && (
                  <Detail label="Based on findings" value={item.finding_positions.join(", ")} />
                )}
              </dl>
              {(available.length > 0 || notYet.length > 0) && (
                <div className="mt-3 rounded-md bg-surface-muted p-3 text-sm">
                  {available.length > 0 && (
                    <p>
                      <span className="font-medium">Braventa helps with: </span>
                      {available.map((s) => s.label).join(", ")}
                    </p>
                  )}
                  {notYet.length > 0 && (
                    <p className={`whitespace-pre-line ${available.length ? "mt-1" : ""}`}>
                      <span className="font-medium">Not in Braventa yet: </span>
                      {notYet.map((s) => s.label).join(", ")}.{" "}
                      {item.manual_alternative || "Use your own tools or a specialist for this part."}
                    </p>
                  )}
                </div>
              )}
              {confirmed && <PlanItemActions itemId={item.id} status={item.status} />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

// UX-1: one card that says what to do next.
export function DoThisFirst({
  diagnosis,
  items,
  draftsWaiting,
  href,
}: {
  diagnosis: DiagnosisRow;
  items: PlanItemRow[];
  draftsWaiting: number;
  // The results page; each next step opens its report section (?view=).
  href: string;
}) {
  const confirmed = diagnosis.status === "confirmed";
  const top = sortedPlan(items, confirmed).find((i) => i.status === "proposed" || i.status === "accepted");
  const next = !confirmed
    ? { text: "Check the diagnosis and confirm your plan", href: `${href}?view=diagnosis` }
    : draftsWaiting > 0
      ? { text: `Review ${draftsWaiting} draft${draftsWaiting === 1 ? "" : "s"} waiting for your approval`, href: `${href}?view=drafts` }
      : top
        ? { text: `Start on: ${top.title}`, href: `${href}?view=plan` }
        : null;

  return (
    <section className="card border-accent" aria-labelledby="do-first-title">
      <p className="eyebrow">Do this first</p>
      {top ? (
        <>
          <h2 id="do-first-title" className="mt-1 font-semibold">
            {top.title}
          </h2>
          <p className="mt-1 whitespace-pre-line text-sm">
            <span className="font-medium">First step: </span>
            {top.first_action}
          </p>
        </>
      ) : (
        <h2 id="do-first-title" className="mt-1 font-semibold">
          Every action in your plan is done or dismissed
        </h2>
      )}
      <ul className="mt-3 space-y-1 text-sm text-muted">
        <li>
          {draftsWaiting > 0
            ? `${draftsWaiting} draft${draftsWaiting === 1 ? "" : "s"} waiting for your approval`
            : "No drafts waiting for approval"}
        </li>
      </ul>
      {next && (
        <Link href={next.href} scroll={false} className="btn-primary mt-3">
          {next.text}
        </Link>
      )}
    </section>
  );
}
