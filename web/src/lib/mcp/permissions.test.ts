import { describe, expect, it } from "vitest";
import { deniedMessage } from "@/lib/team/roles";
import { principalCan, roleOf } from "./principal";
import { handleMessage } from "./protocol";
import { TOOLS, type ToolContext } from "./tools";

// A key or sign-in acts with its user's role (D-046); service keys keep their rule (D-044).

describe("principalCan", () => {
  it("lets a service key use every onboarding tool, whatever its (absent) role", () => {
    expect(principalCan({ kind: "service", role: null }, "analysis.run")).toBe(true);
    expect(principalCan({ kind: "service", role: null }, "profile.edit")).toBe(true);
  });

  it("applies the user's role to personal keys and sign-ins", () => {
    for (const kind of ["personal", "access"] as const) {
      expect(principalCan({ kind, role: "owner" }, "analysis.run")).toBe(true);
      expect(principalCan({ kind, role: "marketing_manager" }, "profile.edit")).toBe(true);
      expect(principalCan({ kind, role: "analyst" }, "analysis.run")).toBe(false);
      expect(principalCan({ kind, role: "copywriter" }, "profile.edit")).toBe(false);
      expect(principalCan({ kind, role: null }, "profile.edit")).toBe(false);
    }
  });

  it("reads the role off a membership row and ignores unknown values", () => {
    expect(roleOf({ role: "admin" })).toBe("admin");
    expect(roleOf({ role: "member" })).toBeNull();
    expect(roleOf(null)).toBeNull();
  });
});

describe("tool permissions", () => {
  it("are the web actions' permissions: writes need one, reads none", () => {
    const byName = Object.fromEntries(TOOLS.map((t) => [t.name, t.permission]));
    expect(byName).toEqual({
      braventa_start_onboarding: "analysis.run",
      braventa_get_discovery_questions: null,
      braventa_submit_discovery: "profile.edit",
      braventa_confirm_priorities: "profile.edit",
      braventa_get_follow_up_questions: null,
      braventa_answer_follow_up_questions: "profile.edit",
      braventa_get_status: null,
    });
  });

  const ctx = (actor: ToolContext["actor"]): ToolContext => ({ db: null as never, organizationId: "org-1", userId: "user-1", appUrl: "https://app.test", actor });
  const call = (name: string) => ({ jsonrpc: "2.0" as const, id: 1, method: "tools/call", params: { name, arguments: {} } });
  const logs: string[] = [];
  const log = async (tool: string, ok: boolean, error?: string) => {
    logs.push(`${tool} ${ok} ${error ?? ""}`);
  };

  it("refuses a write tool to a role without its permission, with the web action's message, before reading arguments", async () => {
    const response = await handleMessage(call("braventa_start_onboarding"), ctx({ kind: "personal", role: "analyst" }), log, ["onboarding"]);
    expect(response).toMatchObject({ result: { isError: true, content: [{ type: "text", text: deniedMessage("analysis.run") }] } });
    expect(logs.at(-1)).toBe(`braventa_start_onboarding false ${deniedMessage("analysis.run")}`);
  });

  it("lets an owner's key and a service key through to argument validation", async () => {
    for (const actor of [{ kind: "personal", role: "owner" }, { kind: "service", role: null }] as const) {
      const response = await handleMessage(call("braventa_start_onboarding"), ctx(actor), log, ["onboarding"]);
      expect(response, actor.kind).toMatchObject({ result: { isError: true } });
      expect(JSON.stringify(response), actor.kind).toMatch(/Invalid arguments/);
    }
  });

  it("still lists every tool in scope, whatever the role", async () => {
    const response = await handleMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" }, ctx({ kind: "access", role: "analyst" }), log, ["onboarding"]);
    expect((response as { result: { tools: unknown[] } }).result.tools).toHaveLength(TOOLS.length);
  });
});
