import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BUSINESS_LIMITS, MAX_BUSINESSES, accountTier, businessUsage, limitMessage, newBusinessPlan } from "./business-limit";
import { TRIAL_DAYS } from "./tiers";

const now = new Date("2026-11-08T12:00:00Z");
const trial = (ends: string) => ({ plan: "trial", trial_ends_at: ends });
const on = (plan: string) => ({ plan, trial_ends_at: "2026-10-01T00:00:00Z" });
const ACTIVE = "2026-11-20T00:00:00Z";
const ENDED = "2026-11-01T00:00:00Z";

describe("the business limit (D-062)", () => {
  it("is Basic 2, Pro 4, Premium 8", () => {
    expect(BUSINESS_LIMITS).toEqual({ basic: 2, pro: 4, premium: 8 });
    expect(MAX_BUSINESSES).toBe(8);
  });

  it("comes from the highest plan among the businesses the account owns, an active trial counting as Pro", () => {
    expect(accountTier([], now)).toBe("basic");
    expect(accountTier([trial(ENDED)], now)).toBe("basic");
    expect(accountTier([trial(ACTIVE)], now)).toBe("pro");
    expect(accountTier([on("basic"), on("premium"), on("pro")], now)).toBe("premium");
    expect(accountTier([trial(ENDED), on("pro")], now)).toBe("pro");
  });

  it("refuses a new business at the limit, and a removed one frees its place", () => {
    expect(businessUsage([], now)).toEqual({ tier: "basic", limit: 2, used: 0, atLimit: false });
    expect(businessUsage([on("basic"), on("basic")], now)).toMatchObject({ limit: 2, used: 2, atLimit: true });
    expect(businessUsage([on("basic")], now).atLimit).toBe(false);
    // A trial ending lowers the limit; the businesses stay, no new ones until there's room.
    const four = [trial(ENDED), trial(ENDED), trial(ENDED), trial(ENDED)];
    expect(businessUsage(four, now)).toMatchObject({ limit: 2, used: 4, atLimit: true });
    expect(businessUsage(four, new Date("2026-10-31T00:00:00Z"))).toMatchObject({ limit: 4, atLimit: true });
  });

  it("says what to do: a higher plan, or a custom plan past Premium", () => {
    expect(limitMessage({ tier: "basic", limit: 2 })).toContain("2 businesses");
    expect(limitMessage({ tier: "basic", limit: 2 })).toContain("higher plan");
    expect(limitMessage({ tier: "premium", limit: 8 })).toContain("custom plan");
  });
});

describe("the plan a new business starts on", () => {
  it("starts the one 14-day trial for an account that never had it", () => {
    const plan = newBusinessPlan([], null, now);
    expect(plan).toMatchObject({ plan: "trial", startsTrial: true });
    expect(plan.trialEndsAt.getTime() - now.getTime()).toBe(TRIAL_DAYS * 86_400_000);
  });

  it("shares the account's trial, so removing a business and scanning again doesn't restart it", () => {
    expect(newBusinessPlan([trial(ACTIVE)], ACTIVE, now)).toEqual({ plan: "trial", trialEndsAt: new Date(ACTIVE), startsTrial: false });
    // Every business removed: still the old, ended trial.
    expect(newBusinessPlan([], ENDED, now)).toEqual({ plan: "trial", trialEndsAt: new Date(ENDED), startsTrial: false });
  });

  it("uses the account's highest plan when one of its businesses is on a plan", () => {
    expect(newBusinessPlan([on("basic"), on("pro"), trial(ACTIVE)], ACTIVE, now)).toMatchObject({ plan: "pro", startsTrial: false });
  });
});

// create_organization() and account_business_limit() repeat these rules in SQL. There is no Postgres in the tests, so
// this reads the migration (comments stripped) and fails when the numbers drift apart.
describe("the business_limits migration", () => {
  const dir = fileURLToPath(new URL("../../../../supabase/migrations/", import.meta.url));
  const files = readdirSync(dir).filter((f) => f.endsWith("_business_limits.sql"));
  const sql = files.length === 1 ? readFileSync(dir + files[0], "utf8").replace(/--.*$/gm, "") : "";
  const limitFn = sql.match(/create or replace function public\.account_business_limit\(uid uuid\)([\s\S]*?)\$\$;/)?.[1] ?? "";
  const createFn = sql.match(/create or replace function public\.create_organization\(org_name text\)([\s\S]*?)\$\$;/)?.[1] ?? "";

  it("maps the plans to the same limits", () => {
    expect(files).toHaveLength(1);
    expect(limitFn).toContain(`when 3 then ${BUSINESS_LIMITS.premium}`);
    expect(limitFn).toContain(`when 2 then ${BUSINESS_LIMITS.pro}`);
    expect(limitFn).toContain(`else ${BUSINESS_LIMITS.basic}`);
    expect(limitFn).toMatch(/o\.plan = 'trial' and o\.trial_ends_at > now\(\) then 2/);
    expect(limitFn).toMatch(/m\.user_id = uid and m\.role = 'owner'/);
  });

  it("counts owned businesses, refuses at the limit with BRV01, and gives one trial per account", () => {
    expect(createFn).toContain("pg_advisory_xact_lock");
    expect(createFn).toMatch(/if owned >= max_businesses then/);
    expect(createFn).toContain("errcode = 'BRV01'");
    expect(createFn).toContain(`interval '${TRIAL_DAYS} days'`);
    expect(createFn).toContain("insert into public.account_trials");
  });

  it("keeps account_trials readable only by its own account and writable by no client", () => {
    expect(sql).toContain("alter table public.account_trials enable row level security");
    expect(sql).toContain("using (user_id = (select auth.uid()))");
    expect(sql).toContain("revoke all on public.account_trials from anon, authenticated");
    expect(sql).toContain("revoke all on function public.account_business_limit(uuid) from public, anon, authenticated");
  });
});
