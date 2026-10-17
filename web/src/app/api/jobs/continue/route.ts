import { after } from "next/server";
import { z } from "zod";
import { continueKey, verifyContinue } from "@/lib/pipeline/continue-token";
import { runAnalysisJob } from "@/lib/pipeline/website-intel";

// Runs one step of an analysis job (every step, the first included) in a fresh function invocation
// (lib/pipeline/steps.ts), so no single invocation runs into the hosting time limit (300 s on Vercel Hobby). Called
// only on behalf of Braventa's own server (lib/pipeline/dispatch.ts): in production by Postgres (pg_net, from a
// job_dispatches row the server recorded), in development by the dev server itself. There is no session, so the
// request must carry an HMAC of the job id and step.
// Answers 202 at once and runs the step after the response; the step itself checks that it is still pending, so a
// repeated or late request does nothing.
export const maxDuration = 300;

const bodySchema = z.object({
  jobId: z.uuid(),
  step: z.string().min(1).max(40),
  token: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  let key: Buffer;
  try {
    key = continueKey();
  } catch (e) {
    console.error("/api/jobs/continue: the hand-off key is missing or invalid (JOB_CONTINUE_SECRET, SUPABASE_SECRET_KEY)", e);
    return Response.json({ error: "Not configured." }, { status: 500 });
  }
  if (!verifyContinue(key, body.jobId, body.step, body.token)) {
    return Response.json({ error: "Invalid token." }, { status: 401 });
  }
  after(() => runAnalysisJob(body.jobId, body.step));
  return Response.json({ accepted: true }, { status: 202 });
}
