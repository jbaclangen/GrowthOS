import { ConsentCheckbox, LegalLink } from "@/components/legal/consent";
import { SETTINGS_RETURN, connectionReturnPath } from "@/lib/integrations/return-to";
import { ConnectSubmit } from "./connect-submit";

// "Connect Google" (Search Console and Google Analytics 4, one consent screen; and "Reconnect"): a GET form to the start route, which redirects to Google's
// consent screen. The checkbox (D-057, MSA §8) is required here and checked again by the start route; the callback
// records it once Google has approved.
export function SearchConsoleConnectForm({
  returnTo,
  organizationId,
  label,
  buttonClassName,
  id,
}: {
  returnTo: string;
  // The business it acts on (D-062); the route or action checks the user's role there.
  organizationId: string;
  label: string;
  buttonClassName: string;
  id: string;
}) {
  const path = connectionReturnPath(returnTo);
  return (
    <form action="/api/integrations/google/start" method="get" className="mt-4 space-y-3">
      {path !== SETTINGS_RETURN && <input type="hidden" name="returnTo" value={path} />}
      <input type="hidden" name="organizationId" value={organizationId} />
      <ConsentCheckbox id={id}>
        I&apos;m authorized to connect this Google account for the business. I&apos;m responsible for the account and its
        data, as the <LegalLink doc="msa">Master Services Agreement</LegalLink> (section 8) describes, and I&apos;ve read
        how Braventa uses Search Console and Google Analytics data in the <LegalLink doc="privacy" />.
      </ConsentCheckbox>
      <ConnectSubmit label={label} provider="Google" className={buttonClassName} />
    </form>
  );
}

// "Connect HubSpot" (and "Reconnect", D-048): the same pattern, a GET form to the HubSpot start route, which redirects
// to HubSpot's install screen. The checkbox is required here, checked again by the start route and recorded by the
// callback once HubSpot has approved (context hubspot_connect).
export function HubSpotConnectForm({
  returnTo,
  organizationId,
  label,
  buttonClassName,
  id,
}: {
  returnTo: string;
  // The business it acts on (D-062); the route or action checks the user's role there.
  organizationId: string;
  label: string;
  buttonClassName: string;
  id: string;
}) {
  const path = connectionReturnPath(returnTo);
  return (
    <form action="/api/integrations/hubspot/start" method="get" className="mt-4 space-y-3">
      {path !== SETTINGS_RETURN && <input type="hidden" name="returnTo" value={path} />}
      <input type="hidden" name="organizationId" value={organizationId} />
      <ConsentCheckbox id={id}>
        I&apos;m authorized to connect this HubSpot portal for the business. I&apos;m responsible for the portal and its
        data, as the <LegalLink doc="msa">Master Services Agreement</LegalLink> (section 8) describes, and I&apos;ve read
        how Braventa uses HubSpot data in the <LegalLink doc="privacy" />.
      </ConsentCheckbox>
      <ConnectSubmit label={label} provider="HubSpot" className={buttonClassName} />
    </form>
  );
}
