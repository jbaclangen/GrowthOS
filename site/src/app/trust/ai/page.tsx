import type { Metadata } from "next";
import Link from "next/link";
import { Band, PageHero } from "@/components/ui";

export const metadata: Metadata = {
  title: "How Braventa uses AI",
  description: "Which AI models Braventa uses, what they see, and how a person stays in charge of every decision.",
};

// Matches web/src/lib/ai/router.ts and docs/architecture/AI_ROUTING_AND_COSTS.md (paid lineup, D-024).
const TASKS = [
  { task: "Matching your own words to common business problems, choosing follow-up questions", model: "Anthropic Claude Haiku" },
  { task: "Building your business profile, planning 30 days of content, drafting posts", model: "Anthropic Claude Sonnet" },
  { task: "Diagnosing your business and building the growth plan; drafts for regulated industries", model: "Anthropic Claude Opus" },
];

export default function AiUse() {
  return (
    <>
      <PageHero eyebrow="AI use" title="AI drafts. You decide.">
        Braventa uses AI to analyze, plan and draft. A person — you — approves what goes out.
      </PageHero>
      <Band>
        <div className="prose-legal">
          <h2>What AI does in Braventa</h2>
          <p>
            The business profile, growth assessment, diagnosis, growth plan, content plan and drafted posts are
            AI-generated from your website, Google PageSpeed scores, and your answers. They can be wrong. That&apos;s why
            each finding shows its evidence and confidence, and why nothing is used for your business until you confirm or
            approve it.
          </p>
          <h2>Which models we use</h2>
          <p>
            Requests go through OpenRouter to models chosen for each task. We may change models as better or more
            economical ones become available; this page will be updated when we do.
          </p>
          <p>
            If the first-choice model is unavailable, a request falls back to a backup model through OpenRouter: Qwen for
            matching your words and choosing questions, OpenAI GPT for the profile, content plan and drafts, and Claude
            Sonnet for the diagnosis.
          </p>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-2 pr-4 font-semibold">Task</th>
                <th className="py-2 font-semibold">Model</th>
              </tr>
            </thead>
            <tbody>
              {TASKS.map((t) => (
                <tr key={t.task} className="border-t border-border align-top">
                  <td className="py-3 pr-4">{t.task}</td>
                  <td className="py-3">{t.model}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="prose-legal mt-10">
          <h2>What the models see</h2>
          <ul>
            <li>Text from your website&apos;s public pages, and its Google PageSpeed scores.</li>
            <li>The answers you give during setup, and any corrections you make to the diagnosis.</li>
            <li>The business profile built from those, so drafts match your brand voice.</li>
          </ul>
          <p>
            Text read from websites is fenced off as data, and the models are told never to follow instructions found in
            it. Your password and payment details are never sent to an AI model.
          </p>
          <h2>What AI does not do</h2>
          <ul>
            <li>It doesn&apos;t publish, send or change anything for your business.</li>
            <li>It doesn&apos;t make decisions about you; it makes proposals you accept or reject.</li>
            <li>It isn&apos;t asked to invent figures: drafts may only use facts from your website and your answers.</li>
          </ul>
          <p>
            See also <Link href="/trust">Trust and data</Link> and <Link href="/legal/subprocessors">Sub-processors</Link>.
          </p>
        </div>
      </Band>
    </>
  );
}
