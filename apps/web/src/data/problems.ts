// Problems and judging, from the API, or from sample data in the prototype build.
// Both paths return the same shapes, so screens don't know the difference.
import { checkOutput } from "@cgl/problem-package/checker";
import type {
  Language,
  ProblemDetail,
  ProblemListResponse,
  RunResponse,
  SubmissionView,
  TestResult,
  Verdict,
} from "@cgl/shared";
import { useQuery } from "@tanstack/react-query";
import { api, API_URL } from "../lib/api";
import { useAuth, useUser } from "../lib/auth";
import { PRACTICE, PRACTICE_TOTALS, RECENT_SUBMISSIONS } from "../mock/data";
import SAMPLE_PROBLEM from "../mock/self-aware.json";

const live = API_URL !== undefined;

/** Wait for the session check, so a signed-in visitor isn't fetched for twice. */
function useAuthSettled(): boolean {
  return useAuth().state.status !== "loading";
}

export function useProblemList() {
  const user = useUser();
  const settled = useAuthSettled();
  return useQuery({
    // Per user: status columns differ between accounts
    queryKey: ["problems", user?.id ?? null],
    enabled: settled,
    queryFn: () => (live ? api<ProblemListResponse>("/problems") : Promise.resolve(sampleList())),
  });
}

export function useProblem(slug: string) {
  const user = useUser();
  const settled = useAuthSettled();
  return useQuery({
    queryKey: ["problem", slug, user?.id ?? null],
    enabled: settled,
    queryFn: () => (live ? api<ProblemDetail>(`/problems/${encodeURIComponent(slug)}`) : Promise.resolve(sampleProblem(slug))),
  });
}

export function useProblemSubmissions(slug: string, enabled: boolean) {
  const user = useUser();
  return useQuery({
    queryKey: ["submissions", slug, user?.id ?? null],
    enabled,
    queryFn: async () =>
      live
        ? (await api<{ submissions: SubmissionView[] }>(`/problems/${encodeURIComponent(slug)}/submissions`)).submissions
        : sampleSubmissions(slug),
  });
}

export function runCode(slug: string, language: Language, code: string, input?: string): Promise<RunResponse> {
  if (!live) return simulateRun(code, input);
  return api<RunResponse>(`/problems/${encodeURIComponent(slug)}/runs`, {
    method: "POST",
    body: JSON.stringify(input === undefined ? { language, code } : { language, code, input }),
  });
}

export function submitCode(slug: string, language: Language, code: string): Promise<SubmissionView> {
  if (!live) return Promise.resolve(simulateSubmission(slug, language, code));
  return api<SubmissionView>(`/problems/${encodeURIComponent(slug)}/submissions`, {
    method: "POST",
    body: JSON.stringify({ language, code }),
  });
}

export function getSubmission(id: string): Promise<SubmissionView> {
  if (!live) return Promise.resolve(simulatedProgress(id));
  return api<SubmissionView>(`/submissions/${encodeURIComponent(id)}`);
}

// ─── Sample data for the prototype ─────────────────────────────────────────

const SAMPLE_CHECKER = { kind: "default", caseSensitive: false, spaceSensitive: false } as const;

function sampleList(): ProblemListResponse {
  const totals = Object.fromEntries(
    (["EASY", "MEDIUM", "HARD"] as const).map((level) => [
      level,
      { total: PRACTICE_TOTALS[level], solved: PRACTICE.filter((p) => p.difficulty === level && p.status === "solved").length },
    ]),
  ) as ProblemListResponse["totals"];
  return { problems: PRACTICE.map(({ acceptance, solvers, ...rest }) => ({ ...rest, acceptance, solvers })), totals };
}

function sampleProblem(slug: string): ProblemDetail {
  // Every sample problem page shows the one fully written sample problem
  const summary = PRACTICE.find((p) => p.slug === slug);
  return {
    slug: SAMPLE_PROBLEM.slug,
    title: SAMPLE_PROBLEM.title,
    difficulty: "EASY",
    tags: SAMPLE_PROBLEM.tags,
    timeLimitMs: SAMPLE_PROBLEM.timeLimitMs,
    memoryLimitMb: SAMPLE_PROBLEM.memoryLimitMb,
    statementHtml: SAMPLE_PROBLEM.statementHtml,
    editorialHtml: SAMPLE_PROBLEM.editorialHtml,
    samples: SAMPLE_PROBLEM.samples,
    testCount: SAMPLE_PROBLEM.samples.length + SAMPLE_PROBLEM.secretTestCount,
    from: summary?.from ?? "Round 12 · A",
    status: summary?.status ?? null,
  };
}

function sampleSubmissions(slug: string): SubmissionView[] {
  return RECENT_SUBMISSIONS.filter((s) => s.problemSlug === slug).map((s) => ({
    id: s.id,
    problemSlug: s.problemSlug,
    language: "cpp",
    status: "FINISHED",
    verdict: s.verdict,
    testsPassed: 0,
    testsTotal: 0,
    results: [],
    compileOutput: null,
    timeMs: s.timeMs,
    memoryKb: null,
    createdAt: new Date().toISOString(),
  }));
}

// Simulated judging: code that takes an absolute difference passes; anything else prints 0
const looksRight = (code: string) => /abs\s*\(/.test(code);

async function simulateRun(code: string, input?: string): Promise<RunResponse> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  if (input !== undefined) {
    return { compileError: null, cases: [{ input, expected: null, output: "0\n", stderr: "", verdict: null, reason: null, timeMs: 3, memoryKb: 3200 }] };
  }
  return {
    compileError: null,
    cases: SAMPLE_PROBLEM.samples.map((sample) => {
      const output = looksRight(code) ? sample.output : "0\n";
      const check = checkOutput(sample.output, output, SAMPLE_CHECKER);
      return {
        input: sample.input,
        expected: sample.output,
        output,
        stderr: "",
        verdict: check.accepted ? "ACCEPTED" : "WRONG_ANSWER",
        reason: check.accepted ? null : check.reason,
        timeMs: 2,
        memoryKb: 3100,
      };
    }),
  };
}

const simulated = new Map<string, { createdAt: number; passes: boolean; slug: string; language: Language }>();
const SIMULATED_TESTS = SAMPLE_PROBLEM.samples.length + SAMPLE_PROBLEM.secretTestCount;

function simulateSubmission(slug: string, language: Language, code: string): SubmissionView {
  const id = `sim-${Date.now()}`;
  simulated.set(id, { createdAt: Date.now(), passes: looksRight(code), slug, language });
  return simulatedProgress(id);
}

/** Progress derived from elapsed time, so polling looks like the real judge. */
function simulatedProgress(id: string): SubmissionView {
  const run = simulated.get(id)!;
  const judged = Math.min(SIMULATED_TESTS, Math.floor((Date.now() - run.createdAt) / 350));
  const failAt = run.passes ? Infinity : 0;
  const results: TestResult[] = Array.from({ length: Math.min(judged, failAt + 1) }, (_, i) => ({
    verdict: i === failAt ? "WRONG_ANSWER" : "ACCEPTED",
    timeMs: 2,
    memoryKb: 3100,
  }));
  const finished = results.length === SIMULATED_TESTS || results.some((r) => r.verdict !== "ACCEPTED");
  const verdict: Verdict | null = finished ? (results.find((r) => r.verdict !== "ACCEPTED")?.verdict ?? "ACCEPTED") : null;
  return {
    id,
    problemSlug: run.slug,
    language: run.language,
    status: finished ? "FINISHED" : results.length ? "RUNNING" : "QUEUED",
    verdict,
    testsPassed: results.filter((r) => r.verdict === "ACCEPTED").length,
    testsTotal: SIMULATED_TESTS,
    results,
    compileOutput: null,
    timeMs: finished ? 2 : null,
    memoryKb: finished ? 3100 : null,
    createdAt: new Date(run.createdAt).toISOString(),
  };
}
