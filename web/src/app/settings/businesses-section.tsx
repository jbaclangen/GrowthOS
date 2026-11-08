import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { memberOrganizations } from "@/lib/memberships";
import { businessUsage, businessesLabel, limitMessage, BUSINESS_LIMITS } from "@/lib/plans/business-limit";
import { effectiveAccess } from "@/lib/plans/tiers";
import { planLabel } from "@/lib/plans/label";
import { can, isRole, ROLE_LABELS } from "@/lib/team/roles";
import { switchBusiness } from "./business-actions";
import { RemoveBusinessButton } from "./remove-business-section";

// Settings → Businesses (D-062): every business the user belongs to, which one they're working on, when each was last
// analyzed and which tools it has connected. Anyone can switch; owners (organization.delete) can remove a business
// with the D-061 dialog. The limit line counts the businesses the user owns against the account's limit.

const TOOL_NAMES: Record<string, string> = {
  google_search_console: "Google Search Console",
  google_analytics: "Google Analytics",
  hubspot: "HubSpot",
};

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export async function BusinessesSection({ userId, currentId }: { userId: string; currentId: string | null }) {
  const supabase = await createSupabaseServerClient();
  const orgs = await memberOrganizations(supabase, userId);
  if (!orgs.length) return null;
  const ids = orgs.map((o) => o.id);
  const [{ data: profiles }, { data: connections }] = await Promise.all([
    supabase.from("business_profiles").select("organization_id, website_url, analyzed_at").in("organization_id", ids),
    supabase.from("integration_connections").select("organization_id, provider, status").in("organization_id", ids),
  ]);

  const lastAnalyzed = new Map<string, { at: string; website: string | null }>();
  for (const p of profiles ?? []) {
    if (!p.analyzed_at) continue;
    const seen = lastAnalyzed.get(p.organization_id);
    if (!seen || p.analyzed_at > seen.at) lastAnalyzed.set(p.organization_id, { at: p.analyzed_at, website: p.website_url });
  }
  const tools = new Map<string, string[]>();
  for (const c of connections ?? []) {
    if (c.status === "revoked") continue;
    tools.set(c.organization_id, [...(tools.get(c.organization_id) ?? []), TOOL_NAMES[c.provider] ?? c.provider]);
  }

  const owned = orgs.filter((o) => o.role === "owner");
  const usage = businessUsage(owned);

  return (
    <section id="businesses" className="card mt-8 scroll-mt-20" aria-labelledby="businesses-heading">
      <p className="eyebrow">Businesses</p>
      <h2 id="businesses-heading" className="mt-1 text-lg font-semibold">
        Your businesses
      </h2>
      <p className="mt-2 text-sm text-muted">
        You own {businessesLabel(usage.used)}. Your account can have up to {usage.limit}: Basic includes{" "}
        {BUSINESS_LIMITS.basic}, Pro (and the trial) {BUSINESS_LIMITS.pro} and Premium {BUSINESS_LIMITS.premium}, going by the
        highest plan among the businesses you own. Removing a business frees its place.
      </p>
      {usage.atLimit ? (
        <p className="mt-3 rounded-md bg-surface-muted px-3 py-2 text-sm" role="status">
          {limitMessage(usage)}{" "}
          <Link href="/plans" className="underline">
            See plans
          </Link>
        </p>
      ) : (
        <Link href="/onboarding?business=new" className="btn-secondary mt-3">
          Add a business
        </Link>
      )}

      <ul className="mt-4 divide-y divide-border text-sm">
        {orgs.map((org) => {
          const current = org.id === currentId;
          const analyzed = lastAnalyzed.get(org.id);
          const connected = tools.get(org.id) ?? [];
          return (
            <li key={org.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{org.name}</span>
                  {current && <span className="chip bg-accent-soft text-accent-soft-foreground">Current</span>}
                  <span className="chip bg-surface-muted text-muted">{planLabel(effectiveAccess(org))}</span>
                </p>
                <p className="mt-1 text-xs text-muted">
                  {isRole(org.role) ? ROLE_LABELS[org.role] : org.role} ·{" "}
                  {analyzed
                    ? `Last analyzed ${dateFormat.format(new Date(analyzed.at))}${analyzed.website ? ` (${analyzed.website})` : ""}`
                    : "Not analyzed yet"}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {connected.length ? `Connected: ${connected.join(", ")}` : "No tools connected"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!current && (
                  <form action={switchBusiness}>
                    <input type="hidden" name="organizationId" value={org.id} />
                    <button type="submit" className="btn-secondary">
                      Switch to {org.name}
                    </button>
                  </form>
                )}
                {can(org.role, "organization.delete") && <RemoveBusinessButton organizationId={org.id} name={org.name} />}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
