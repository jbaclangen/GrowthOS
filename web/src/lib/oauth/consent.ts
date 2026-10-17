import { checkAuthorizeRequest, errorRedirect, successRedirect, type AuthorizeParams, type ClientInfo } from "./authorize-request";
import { issueCode, type OAuthStore } from "./grants";

// The consent decision (POST from /oauth/authorize). Pure apart from the store, so it's unit-tested. The request is
// validated again from scratch: nothing from the page is trusted except what checkAuthorizeRequest re-derives, and
// the organization must be one the signed-in user belongs to (memberships read through RLS by the caller).

export type ConsentInput = {
  params: AuthorizeParams;
  client: ClientInfo | null;
  origin: string;
  userId: string;
  decision: "approve" | "deny";
  organizationId: string | null;
  memberOf: readonly string[];
};

export type ConsentResult = { kind: "redirect"; url: string } | { kind: "show-error"; message: string };

export async function decideConsent(store: OAuthStore, input: ConsentInput, now = new Date()): Promise<ConsentResult> {
  const check = checkAuthorizeRequest(input.params, input.client, input.origin);
  if (check.kind === "show-error") return check;
  if (check.kind === "redirect-error") return { kind: "redirect", url: check.url };
  const { request } = check;

  if (input.decision === "deny") {
    return { kind: "redirect", url: errorRedirect(request.redirectUri, input.origin, "access_denied", "The owner didn't approve the connection.", request.state) };
  }
  if (!input.organizationId || !input.memberOf.includes(input.organizationId)) {
    return { kind: "show-error", message: "Choose a business you belong to." };
  }
  const code = await issueCode(
    store,
    {
      clientId: request.clientId,
      redirectUri: request.redirectUri,
      codeChallenge: request.codeChallenge,
      userId: input.userId,
      organizationId: input.organizationId,
      scopes: request.scopes,
      resource: request.resource,
    },
    now,
  );
  return { kind: "redirect", url: successRedirect(request.redirectUri, input.origin, code, request.state) };
}
