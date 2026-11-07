import { getCurrentOrg } from "@/lib/auth";
import { SETTINGS_RETURN } from "@/lib/integrations/return-to";
import { suggestTools } from "@/lib/integrations/tool-catalog";
import { HubSpotCard } from "@/components/connections/hubspot-card";
import { SearchConsoleCard } from "@/components/connections/search-console-card";
import { ToolCardList } from "@/components/connections/tool-cards";

// Settings → Connections: the optional Google Search Console and HubSpot connections (Pro), then the tools that are
// coming soon. The same cards appear on the onboarding step "Connect your tools" (D-041).
export async function ConnectionsSection({ userId }: { userId: string }) {
  const org = await getCurrentOrg(userId);
  const comingSoon = suggestTools({ painPoints: [], tools: [] }).filter((s) => s.tool.status === "coming_soon");

  return (
    <>
      <SearchConsoleCard org={org} returnTo={SETTINGS_RETURN} sectionId="connections" eyebrow="Connections" />
      <HubSpotCard org={org} returnTo={SETTINGS_RETURN} />
      <section className="card mt-6" aria-labelledby="coming-soon-tools-heading">
        <h3 id="coming-soon-tools-heading" className="text-lg font-semibold">
          More tools, coming soon
        </h3>
        <p className="mt-1 text-sm text-muted">These aren&apos;t available yet. They&apos;re marked Coming soon until they work.</p>
        <ToolCardList items={comingSoon} headingLevel={4} nested />
      </section>
    </>
  );
}
