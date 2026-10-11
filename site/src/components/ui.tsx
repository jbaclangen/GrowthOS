import Link from "next/link";
import { PRIMARY_CTA } from "@/lib/site";

// Small building blocks shared by the marketing pages.

export type Status = "live" | "partial" | "next";

// "Coming next" must be visually quieter than "Live" (outline vs filled) and never use Volt (WEBSITE_MESSAGING §3.4).
export function StatusBadge({ status }: { status: Status }) {
  if (status === "live") return <span className="chip bg-success-soft text-foreground">Live</span>;
  if (status === "partial") return <span className="chip bg-surface-muted text-foreground">Live in part</span>;
  return <span className="chip border border-border text-muted">Coming next</span>;
}

// A full-width band. "ink" bands are dark regardless of the visitor's theme (VISUAL_IDENTITY §3.5).
export function Band({
  tone = "paper",
  children,
  className = "",
  labelledBy,
}: {
  tone?: "paper" | "surface" | "ink";
  children: React.ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  const toneClass =
    tone === "ink" ? "bg-brand-ink text-brand-paper" : tone === "surface" ? "bg-surface" : "bg-background";
  return (
    <section aria-labelledby={labelledBy} className={`${toneClass} ${className}`}>
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-24">{children}</div>
    </section>
  );
}

export function SectionIntro({
  head,
  title,
  id,
  children,
  invert = false,
}: {
  head?: string;
  title: string;
  id?: string;
  children?: React.ReactNode;
  invert?: boolean;
}) {
  return (
    <div className="max-w-3xl">
      {head && <p className={`section-head ${invert ? "text-brand-volt" : ""}`}>{head}</p>}
      <h2 id={id} className="mt-3 text-3xl leading-tight md:text-5xl">
        {title}
      </h2>
      {children && <div className={`mt-4 text-lg leading-relaxed ${invert ? "text-brand-paper/80" : "text-muted"}`}>{children}</div>}
    </div>
  );
}

export function CtaRow({ secondary, note }: { secondary?: { label: string; href: string }; note?: string }) {
  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <Link href={PRIMARY_CTA.href} className="btn-primary">
          {PRIMARY_CTA.label}
        </Link>
        {secondary && (
          <Link href={secondary.href} className="btn-secondary">
            {secondary.label}
          </Link>
        )}
      </div>
      {note && <p className="mt-3 text-sm opacity-80">{note}</p>}
    </div>
  );
}

export function PageHero({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <section className="bg-brand-ink text-brand-paper">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-24">
        <p className="section-head text-brand-volt">{eyebrow}</p>
        <h1 className="mt-3 max-w-4xl text-4xl leading-tight md:text-6xl">{title}</h1>
        {children && <div className="mt-5 max-w-3xl text-lg leading-relaxed text-brand-paper/80">{children}</div>}
      </div>
    </section>
  );
}

export function DraftNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-warning bg-warning-soft p-4 text-sm" role="note">
      <span className="chip bg-warning-soft text-foreground">Draft</span>
      <div className="mt-2">{children}</div>
    </div>
  );
}
