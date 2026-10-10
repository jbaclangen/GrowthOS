import { describe, expect, it } from "vitest";
import { PAIN_POINTS } from "./catalog";
import {
  MAX_FOLLOW_UPS,
  NOT_APPLICABLE,
  answerLabel,
  candidateId,
  candidateQuestions,
  fallbackSelection,
  nextRoundSize,
  parseFollowUpForm,
  questionsFor,
  sanitizeSelection,
} from "./followups";
import { onboardingPath } from "./steps";

const form = (entries: [string, string][]) => {
  const fd = new FormData();
  for (const [k, v] of entries) fd.append(k, v);
  return fd;
};

describe("question bank", () => {
  it("has unique keys and valid choices for every pain point", () => {
    for (const pp of PAIN_POINTS) {
      const qs = questionsFor(pp.id);
      expect(new Set(qs.map((q) => q.key)).size).toBe(qs.length);
      for (const q of qs) {
        if (q.type === "choice") {
          expect(q.choices.length).toBeGreaterThanOrEqual(2);
          expect(new Set(q.choices.map((c) => c.value)).size).toBe(q.choices.length);
          expect(q.choices.some((c) => c.value === NOT_APPLICABLE)).toBe(false);
        }
      }
    }
  });

  it("puts pain-point-specific questions first", () => {
    expect(questionsFor("leads.slow_follow_up")[0].key).toBe("reply_speed");
    expect(questionsFor("strategy.no_plan")[0].key).toBe("severity");
  });

  it("shows a choice's label and free text as written", () => {
    expect(answerLabel("leads.slow_follow_up", "reply_speed", "same_day")).toBe("The same day");
    expect(answerLabel("leads.too_few", "lead_sources", "Mostly referrals")).toBe("Mostly referrals");
  });
});

describe("candidateQuestions", () => {
  it("covers only the priorities and never repeats an asked question", () => {
    const c = candidateQuestions({
      priorities: ["leads.slow_follow_up", "website.search_visibility"],
      asked: [{ painPointId: "leads.slow_follow_up", key: "reply_speed" }],
      knownTools: false,
    });
    expect(c.some((x) => x.id === candidateId("leads.slow_follow_up", "reply_speed"))).toBe(false);
    expect(new Set(c.map((x) => x.painPointId))).toEqual(new Set(["leads.slow_follow_up", "website.search_visibility"]));
    expect(c.find((x) => x.painPointId === "website.search_visibility")?.priority).toBe(2);
  });

  it("doesn't ask about tools the owner already listed", () => {
    const c = candidateQuestions({ priorities: ["crm.underused"], asked: [], knownTools: true });
    expect(c.some((x) => x.key === "tools")).toBe(false);
  });

  it("ignores IDs that aren't in the catalog", () => {
    expect(candidateQuestions({ priorities: ["made.up"], asked: [], knownTools: false })).toEqual([]);
  });
});

describe("rounds", () => {
  it("asks at most two rounds and the total cap", () => {
    expect(nextRoundSize(0, 0)).toBe(2);
    expect(nextRoundSize(1, 2)).toBe(2);
    expect(nextRoundSize(1, MAX_FOLLOW_UPS)).toBe(0);
    expect(nextRoundSize(2, 2)).toBe(0);
  });

  it("falls back to one question per priority in turn", () => {
    const c = candidateQuestions({ priorities: ["leads.too_few", "content.inconsistent"], asked: [], knownTools: false });
    expect(fallbackSelection(c, 2).map((x) => x.id)).toEqual([
      candidateId("leads.too_few", "lead_sources"),
      candidateId("content.inconsistent", "posting_now"),
    ]);
  });
});

describe("sanitizeSelection", () => {
  const c = candidateQuestions({ priorities: ["leads.too_few"], asked: [], knownTools: false });

  it("keeps only offered questions, without duplicates, up to the round size", () => {
    const ids = [c[2].id, "leads.too_few::invented", c[2].id, c[0].id, c[1].id];
    const out = sanitizeSelection({ questions: ids.map((id) => ({ id })) }, c, 2, false);
    expect(out.map((x) => x.id)).toEqual([c[2].id, c[0].id]);
  });

  it("allows stopping after the first round, but not before it", () => {
    expect(sanitizeSelection({ questions: [], enough: true }, c, 2, false)).toEqual([]);
    expect(sanitizeSelection({ questions: [], enough: true }, c, 2, true)).toHaveLength(2);
  });
});

describe("parseFollowUpForm", () => {
  const pending = [
    { id: "a", painPointId: "leads.slow_follow_up", key: "reply_speed" },
    { id: "b", painPointId: "leads.slow_follow_up", key: "current_process" },
    { id: "c", painPointId: "leads.slow_follow_up", key: "evidence" },
    { id: "d", painPointId: "leads.slow_follow_up", key: "urgency" },
  ];

  it("records answers, skips and not-applicable", () => {
    const r = parseFollowUpForm(
      form([
        ["answer:a", "same_day"],
        ["answer:b", "  I check Messenger at night  "],
        ["answer:c", ""],
        ["answer:d", NOT_APPLICABLE],
      ]),
      pending,
    );
    expect(r).toEqual({
      data: [
        { id: "a", status: "answered", answer: "same_day" },
        { id: "b", status: "answered", answer: "I check Messenger at night" },
        { id: "c", status: "skipped", answer: null },
        { id: "d", status: "not_applicable", answer: null },
      ],
    });
  });

  it("treats the not-applicable checkbox as not applicable even with text", () => {
    const r = parseFollowUpForm(form([["answer:b", "x"], ["na:b", "on"]]), [pending[1]]);
    expect(r).toEqual({ data: [{ id: "b", status: "not_applicable", answer: null }] });
  });

  it("rejects an unknown choice and overly long text", () => {
    expect(parseFollowUpForm(form([["answer:a", "tomorrow"]]), [pending[0]])).toHaveProperty("error");
    expect(parseFollowUpForm(form([["answer:b", "x".repeat(501)]]), [pending[1]])).toHaveProperty("error");
  });
});

describe("onboardingPath", () => {
  const s = { id: "s1", business_profile_id: "p1" };
  it("resumes at the step the owner left", () => {
    expect(onboardingPath({ ...s, status: "discovering" })).toBe("/onboarding/s1");
    expect(onboardingPath({ ...s, status: "reviewing" })).toBe("/onboarding/s1/review");
    expect(onboardingPath({ ...s, status: "following_up" })).toBe("/onboarding/s1/questions");
    expect(onboardingPath({ ...s, status: "completed" })).toBe("/analysis/p1");
  });
});
