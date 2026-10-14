import { LANGUAGES, type Language, type ProblemDetail, type RunCase, type RunResponse, type SubmissionView, type Verdict } from "@cgl/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { AccountMenu, ThemeButton } from "../components/AppShell";
import { CodeEditor } from "../components/CodeEditor";
import { Wordmark } from "../components/show";
import { Button, Icon, VERDICT_LABEL, VERDICT_TEXT, VerdictChip } from "../components/ui";
import { getSubmission, runCode, submitCode, useProblem, useProblemSubmissions } from "../data/problems";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";

const STARTER: Record<Language, string> = {
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    return 0;
}
`,
  python: `import sys


def main():
    data = sys.stdin.read().split()


main()
`,
  javascript: `const data = require("fs").readFileSync(0, "utf8").trim().split(/\\s+/);
`,
  java: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));
    }
}
`,
};

// Drafts and the language choice live in this browser, per problem
const draftKey = (slug: string, language: Language) => `cgl:draft:${slug}:${language}`;
function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the draft just won't survive a reload
  }
}
const readLanguage = (): Language => {
  const saved = readStored("cgl:language");
  return saved && saved in LANGUAGES ? (saved as Language) : "cpp";
};

const errorMessage = (error: unknown) => (error instanceof ApiError ? error.message : "Something went wrong. Try again.");

function useSplit(initial: number, axis: "x" | "y", min: number, max: number) {
  const [size, setSize] = useState(initial);
  const container = useRef<HTMLDivElement>(null);
  const start = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const handle = event.currentTarget;
      handle.setPointerCapture(event.pointerId);
      const move = (e: globalThis.PointerEvent) => {
        const rect = container.current!.getBoundingClientRect();
        const next = axis === "x" ? ((e.clientX - rect.left) / rect.width) * 100 : rect.bottom - e.clientY;
        setSize(Math.min(max, Math.max(min, next)));
      };
      const stop = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", stop);
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", stop);
    },
    [axis, min, max],
  );
  return { size, container, start };
}

export function Arena() {
  const { slug = "" } = useParams();
  const problem = useProblem(slug);

  if (problem.isPending) {
    return (
      <div className="flex h-full flex-col">
        <ArenaHeader title="" />
        <div className="flex flex-1 items-center justify-center text-base text-muted">Loading problem…</div>
      </div>
    );
  }
  if (problem.isError) {
    const missing = problem.error instanceof ApiError && problem.error.status === 404;
    return (
      <div className="flex h-full flex-col">
        <ArenaHeader title="" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-base text-muted">
          {missing ? "This problem doesn't exist, or isn't released yet." : "Couldn't load this problem."}
          <Link to="/problems" className="text-fg underline underline-offset-4">
            Back to problems
          </Link>
        </div>
      </div>
    );
  }
  // Keyed so switching problems resets the workspace
  return <Workspace key={problem.data.slug} problem={problem.data} />;
}

function ArenaHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line px-3 sm:px-4">
      <Link to="/problems" className="flex items-center gap-2 text-sm text-muted hover:text-fg" aria-label="Back to problems">
        <Wordmark compact />
      </Link>
      <span className="text-faint">/</span>
      <Link to="/problems" className="hidden text-sm text-muted hover:text-fg sm:inline">
        Problems
      </Link>
      {title ? (
        <>
          <span className="hidden text-faint sm:inline">/</span>
          <h1 className="truncate text-base font-semibold">{title}</h1>
        </>
      ) : null}
      <div className="ml-auto flex items-center gap-2">
        {actions ? <div className="hidden md:block">{actions}</div> : null}
        <ThemeButton />
        <div className="hidden sm:block">
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

type RunState = { pending: true; custom: boolean } | { pending: false; custom: boolean; response?: RunResponse; error?: string };

function Workspace({ problem }: { problem: ProblemDetail }) {
  const { state, live } = useAuth();
  const canJudge = !live || state.status === "signed-in";
  const queryClient = useQueryClient();

  const [language, setLanguage] = useState<Language>(readLanguage);
  const [code, setCode] = useState(() => readStored(draftKey(problem.slug, language)) ?? STARTER[language]);
  const [leftTab, setLeftTab] = useState<LeftTab>("statement");
  const [mobileTab, setMobileTab] = useState<"problem" | "code" | "tests">("problem");
  const [testTab, setTestTab] = useState<number | "custom">(0);
  const [customInput, setCustomInput] = useState(problem.samples[0]?.input ?? "");
  const [run, setRun] = useState<RunState | null>(null);
  const [submission, setSubmission] = useState<SubmissionView | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const horizontal = useSplit(44, "x", 28, 70);
  const vertical = useSplit(260, "y", 140, 520);

  const changeCode = (next: string) => {
    setCode(next);
    writeStored(draftKey(problem.slug, language), next);
  };

  const changeLanguage = (next: Language) => {
    setLanguage(next);
    writeStored("cgl:language", next);
    setCode(readStored(draftKey(problem.slug, next)) ?? STARTER[next]);
  };

  const doRun = async () => {
    if (!canJudge || run?.pending) return;
    const custom = testTab === "custom";
    setRun({ pending: true, custom });
    setMobileTab("tests");
    try {
      const response = await runCode(problem.slug, language, code, custom ? customInput : undefined);
      setRun({ pending: false, custom, response });
    } catch (error) {
      setRun({ pending: false, custom, error: errorMessage(error) });
    }
  };

  const doSubmit = async () => {
    if (!canJudge || (submission && submission.status !== "FINISHED")) return;
    setSubmitError(null);
    try {
      setSubmission(await submitCode(problem.slug, language, code));
    } catch (error) {
      setSubmitError(errorMessage(error));
    }
  };

  // Poll the submission until the judge finishes, then refresh what it changed
  useEffect(() => {
    if (!submission || submission.status === "FINISHED") return;
    const timer = setTimeout(async () => {
      try {
        const next = await getSubmission(submission.id);
        setSubmission(next);
        if (next.status === "FINISHED") {
          void queryClient.invalidateQueries({ queryKey: ["problems"] });
          void queryClient.invalidateQueries({ queryKey: ["problem", problem.slug] });
          void queryClient.invalidateQueries({ queryKey: ["submissions", problem.slug] });
        }
      } catch {
        setSubmission({ ...submission }); // try again on the next tick
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [submission, problem.slug, queryClient]);

  const statusLine = submission ? <SubmissionStatusLine submission={submission} sampleCount={problem.samples.length} /> : run ? <RunStatusLine run={run} /> : null;

  const toolbar = (
    <div className="flex items-center gap-2">
      <select
        id="language"
        aria-label="Language"
        value={language}
        onChange={(e) => changeLanguage(e.target.value as Language)}
        className="h-8 rounded-sm border border-line bg-raised px-2 text-sm"
      >
        {(Object.keys(LANGUAGES) as Language[]).map((lang) => (
          <option key={lang} value={lang}>
            {LANGUAGES[lang].label}
          </option>
        ))}
      </select>
      {canJudge ? (
        <>
          <Button size="sm" onClick={doRun} disabled={run?.pending} shortcut="⌘'" aria-keyshortcuts="Meta+'">
            <Icon name="play" className="size-3.5" /> {run?.pending ? "Running…" : "Run"}
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={doSubmit}
            disabled={Boolean(submission && submission.status !== "FINISHED")}
            shortcut="⌘↵"
            aria-keyshortcuts="Meta+Enter"
          >
            Submit
          </Button>
        </>
      ) : (
        <Link to="/" className="inline-flex h-8 items-center rounded-sm bg-signal px-3 text-sm font-semibold text-on-signal">
          Sign in to run code
        </Link>
      )}
    </div>
  );

  const editor = (
    <CodeEditor
      language={language}
      initialCode={code}
      documentKey={`${problem.slug}:${language}`}
      onChange={changeCode}
      onRun={() => void doRun()}
      onSubmit={() => void doSubmit()}
    />
  );

  const tests = (
    <TestsPanel
      problem={problem}
      run={run}
      submission={submission}
      submitError={submitError}
      testTab={testTab}
      onTestTab={setTestTab}
      customInput={customInput}
      onCustomInput={setCustomInput}
      statusLine={statusLine}
    />
  );

  return (
    <div className="flex h-full flex-col">
      <ArenaHeader title={problem.title} actions={toolbar} />

      {/* Desktop: statement | editor over tests */}
      <div ref={horizontal.container} className="hidden min-h-0 flex-1 md:flex">
        <section className="flex min-w-0 flex-col" style={{ width: `${horizontal.size}%` }}>
          <ProblemTabs problem={problem} tab={leftTab} onTab={setLeftTab} />
        </section>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize statement and editor"
          onPointerDown={horizontal.start}
          className="w-1.5 shrink-0 cursor-col-resize bg-line transition-colors hover:bg-signal/60 active:bg-signal"
        />
        <section ref={vertical.container} className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">{editor}</div>
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize editor and tests"
            onPointerDown={vertical.start}
            className="h-1.5 shrink-0 cursor-row-resize bg-line transition-colors hover:bg-signal/60 active:bg-signal"
          />
          <div className="flex min-h-0 flex-col" style={{ height: vertical.size }}>
            {tests}
          </div>
        </section>
      </div>

      {/* Phone: one pane at a time, actions pinned to the bottom */}
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <div role="tablist" aria-label="Workspace" className="flex shrink-0 border-b border-line">
          {(["problem", "code", "tests"] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={mobileTab === tab}
              onClick={() => setMobileTab(tab)}
              className={`h-10 flex-1 text-sm capitalize ${mobileTab === tab ? "text-fg font-semibold shadow-[inset_0_-2px_0_var(--fg)]" : "text-muted"}`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1">
          {mobileTab === "problem" ? <ProblemTabs problem={problem} tab={leftTab} onTab={setLeftTab} /> : null}
          {mobileTab === "code" ? editor : null}
          {mobileTab === "tests" ? tests : null}
        </div>
        <div className="flex shrink-0 justify-end border-t border-line px-3 py-2 pb-[max(8px,env(safe-area-inset-bottom,0px))]">{toolbar}</div>
      </div>
    </div>
  );
}

type LeftTab = "statement" | "editorial" | "submissions";

function ProblemTabs({ problem, tab, onTab }: { problem: ProblemDetail; tab: LeftTab; onTab: (t: LeftTab) => void }) {
  return (
    <>
      <div role="tablist" aria-label="Problem" className="flex h-10 shrink-0 items-end gap-5 border-b border-line px-5">
        {(["statement", "editorial", "submissions"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => onTab(t)}
            className={`h-10 text-sm capitalize ${tab === t ? "text-fg font-semibold shadow-[inset_0_-2px_0_var(--fg)]" : "text-muted hover:text-fg"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
        {tab === "statement" ? <Statement problem={problem} /> : null}
        {tab === "editorial" ? (
          problem.editorialHtml ? (
            <div className="statement" dangerouslySetInnerHTML={{ __html: problem.editorialHtml }} />
          ) : (
            <p className="text-base text-muted">There's no editorial for this problem yet.</p>
          )
        ) : null}
        {tab === "submissions" ? <SubmissionsList slug={problem.slug} /> : null}
      </div>
    </>
  );
}

function Statement({ problem }: { problem: ProblemDetail }) {
  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <span className="label">{problem.from ?? "Practice"}</span>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold">{problem.title}</h2>
          {problem.status === "solved" ? (
            <span className="inline-flex items-center gap-1 text-sm text-ok">
              <Icon name="check" className="size-4" /> Solved
            </span>
          ) : null}
        </div>
        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
          <div className="flex gap-1.5">
            <dt>Time</dt>
            <dd className="num text-fg">{problem.timeLimitMs / 1000} s</dd>
          </div>
          <div className="flex gap-1.5">
            <dt>Memory</dt>
            <dd className="num text-fg">{problem.memoryLimitMb} MB</dd>
          </div>
          {problem.tags.length ? (
            <div className="flex gap-1.5">
              <dt>Tags</dt>
              <dd className="text-fg">{problem.tags.join(", ")}</dd>
            </div>
          ) : null}
        </dl>
      </header>
      {/* Sanitised when the problem was published */}
      <div className="statement" dangerouslySetInnerHTML={{ __html: problem.statementHtml }} />
      <section className="flex max-w-[68ch] flex-col gap-4">
        <h3 className="text-md font-semibold">Samples</h3>
        {problem.samples.map((sample, i) => (
          <div key={i} className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2">
            <SampleBlock title={`Input ${i + 1}`} text={sample.input} />
            <SampleBlock title={`Output ${i + 1}`} text={sample.output} />
          </div>
        ))}
      </section>
    </article>
  );
}

function SampleBlock({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      },
      () => undefined,
    );
  };
  return (
    <div className="flex min-w-0 flex-col bg-sunken">
      <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
        <span className="label">{title}</span>
        <button type="button" onClick={copy} className="flex items-center gap-1 text-2xs text-faint hover:text-fg">
          <Icon name={copied ? "check" : "copy"} className="size-3.5" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2.5 font-mono text-sm leading-6">{text}</pre>
    </div>
  );
}

const timeAgo = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} h ago` : new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

function SubmissionsList({ slug }: { slug: string }) {
  const { state, live } = useAuth();
  const signedIn = !live || state.status === "signed-in";
  const submissions = useProblemSubmissions(slug, signedIn);
  if (!signedIn) return <p className="text-base text-muted">Sign in to see your submissions.</p>;
  if (submissions.isPending) return <p className="text-base text-muted">Loading…</p>;
  if (submissions.isError) return <p className="text-base text-muted">Couldn't load your submissions.</p>;
  if (submissions.data.length === 0) return <p className="text-base text-muted">You haven't submitted this problem yet.</p>;
  return (
    <ul className="flex flex-col">
      {submissions.data.map((s) => (
        <li key={s.id} className="flex items-center gap-4 border-b border-line py-3 text-sm">
          {s.verdict ? <VerdictChip verdict={s.verdict} /> : <span className="w-9 text-center text-faint">…</span>}
          <span className="text-muted">{LANGUAGES[s.language].label}</span>
          <span className="num text-muted">{s.timeMs === null ? "–" : `${s.timeMs} ms`}</span>
          <span className="ml-auto text-faint">{timeAgo(s.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}

function Dots({ states }: { states: Array<Verdict | "running" | "waiting"> }) {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {states.map((state, i) => (
        <span
          key={i}
          className={`size-2 rounded-[2px] ${
            state === "waiting" ? "bg-line-strong" : state === "running" ? "tally bg-fg" : state === "ACCEPTED" ? "bg-ok" : "bg-bad"
          }`}
        />
      ))}
    </span>
  );
}

function SubmissionStatusLine({ submission, sampleCount }: { submission: SubmissionView; sampleCount: number }) {
  const done = submission.status === "FINISHED";
  const failedAt = submission.results.findIndex((r) => r.verdict !== "ACCEPTED");
  const states = Array.from({ length: submission.testsTotal }, (_, i) => {
    const result = submission.results[i];
    if (result) return result.verdict;
    return !done && i === submission.results.length && submission.status === "RUNNING" ? ("running" as const) : ("waiting" as const);
  });
  let text: ReactNode;
  if (!done) {
    text = (
      <span className="num truncate text-sm text-muted">
        {submission.status === "QUEUED" ? "Queued" : "Judging"} · {submission.testsPassed}/{submission.testsTotal}
      </span>
    );
  } else {
    const verdict = submission.verdict ?? "INTERNAL_ERROR";
    const where =
      verdict === "ACCEPTED"
        ? ` · all ${submission.testsTotal} tests passed`
        : failedAt >= 0
          ? ` on test ${failedAt + 1}${failedAt >= sampleCount ? " (hidden)" : ""}`
          : "";
    text = (
      <span className={`truncate text-sm font-semibold ${VERDICT_TEXT[verdict]}`}>
        {VERDICT_LABEL[verdict]}
        {where}
      </span>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-3" aria-live="polite">
      {verdictNeedsNoDots(submission) ? null : <Dots states={states} />}
      {text}
    </div>
  );
}

const verdictNeedsNoDots = (s: SubmissionView) => s.verdict === "COMPILATION_ERROR" || s.verdict === "INTERNAL_ERROR";

function RunStatusLine({ run }: { run: RunState }) {
  let text: ReactNode;
  if (run.pending) text = <span className="text-sm text-muted">{run.custom ? "Running with your input…" : "Running samples…"}</span>;
  else if (run.error) text = <span className="text-sm text-bad">{run.error}</span>;
  else if (run.response?.compileError !== null && run.response?.compileError !== undefined)
    text = <span className="text-sm font-semibold text-neutral">Compilation error</span>;
  else if (run.custom) text = <span className="text-sm text-muted">Ran with your input</span>;
  else {
    const cases = run.response?.cases ?? [];
    const passed = cases.filter((c) => c.verdict === "ACCEPTED").length;
    text = (
      <span className={`text-sm font-semibold ${passed === cases.length ? "text-ok" : "text-bad"}`}>
        {passed} of {cases.length} samples passed
      </span>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-3" aria-live="polite">
      {text}
    </div>
  );
}

function TestsPanel({
  problem,
  run,
  submission,
  submitError,
  testTab,
  onTestTab,
  customInput,
  onCustomInput,
  statusLine,
}: {
  problem: ProblemDetail;
  run: RunState | null;
  submission: SubmissionView | null;
  submitError: string | null;
  testTab: number | "custom";
  onTestTab: (tab: number | "custom") => void;
  customInput: string;
  onCustomInput: (input: string) => void;
  statusLine: ReactNode;
}) {
  const response = run && !run.pending ? run.response : undefined;
  const sampleCases = response && !run?.custom ? response.cases : [];
  const customCase = response && run?.custom ? response.cases[0] : undefined;
  const compileError = response?.compileError ?? (submission?.verdict === "COMPILATION_ERROR" ? submission.compileOutput : null);

  return (
    <div className="flex h-full min-h-0 flex-col bg-raised">
      <div className="flex h-10 shrink-0 items-center gap-4 border-b border-line px-4">
        <div role="tablist" aria-label="Tests" className="flex h-full items-end gap-4">
          {problem.samples.map((_, i) => {
            const verdict = sampleCases[i]?.verdict;
            return (
              <button
                key={i}
                role="tab"
                aria-selected={testTab === i}
                onClick={() => onTestTab(i)}
                className={`flex h-10 items-center gap-1.5 text-sm ${testTab === i ? "text-fg font-semibold shadow-[inset_0_-2px_0_var(--fg)]" : "text-muted hover:text-fg"}`}
              >
                {verdict ? <span className={`size-1.5 rounded-full ${verdict === "ACCEPTED" ? "bg-ok" : "bg-bad"}`} /> : null}
                Sample {i + 1}
              </button>
            );
          })}
          <button
            role="tab"
            aria-selected={testTab === "custom"}
            onClick={() => onTestTab("custom")}
            className={`h-10 text-sm ${testTab === "custom" ? "text-fg font-semibold shadow-[inset_0_-2px_0_var(--fg)]" : "text-muted hover:text-fg"}`}
          >
            Custom input
          </button>
        </div>
        <div className="ml-auto min-w-0">{submitError ? <span className="text-sm text-bad">{submitError}</span> : statusLine}</div>
      </div>

      {compileError ? (
        <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
          <span className="label">Compiler output</span>
          <pre className="mt-2 font-mono text-sm leading-6 whitespace-pre-wrap text-bad">{compileError}</pre>
        </div>
      ) : testTab === "custom" ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-px overflow-y-auto bg-line sm:grid-cols-2">
          <label className="flex min-w-0 flex-col bg-raised">
            <span className="label px-4 pt-3">Your input</span>
            <textarea
              id="custom-input"
              value={customInput}
              onChange={(e) => onCustomInput(e.target.value)}
              spellCheck={false}
              className="min-h-28 flex-1 resize-none bg-transparent px-4 py-2 font-mono text-sm leading-6 focus:outline-none"
            />
          </label>
          {customCase ? <CaseOutput result={customCase} /> : <IoBlock title="Output" text="Pick Run to try your code on this input." muted />}
        </div>
      ) : (
        <SampleView sample={problem.samples[testTab]!} result={sampleCases[testTab]} running={Boolean(run?.pending && !run.custom)} />
      )}
    </div>
  );
}

function SampleView({ sample, result, running }: { sample: { input: string; output: string }; result: RunCase | undefined; running: boolean }) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-px overflow-y-auto bg-line sm:grid-cols-3">
      <IoBlock title="Input" text={sample.input} />
      <IoBlock title="Expected" text={sample.output} />
      {result ? <CaseOutput result={result} /> : <IoBlock title="Your output" text={running ? "Running…" : "Run your code to see its output here."} muted />}
    </div>
  );
}

function IoBlock({ title, text, muted = false }: { title: string; text: string; muted?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col bg-raised">
      <span className="label px-4 pt-3">{title}</span>
      <pre className={`overflow-x-auto px-4 py-2 font-mono text-sm leading-6 ${muted ? "font-sans text-faint" : ""}`}>{text}</pre>
    </div>
  );
}

/** Your output, with the verdict up top, differing lines marked and any error output. */
function CaseOutput({ result }: { result: RunCase }) {
  const passed = result.verdict === "ACCEPTED";
  const judged = result.verdict !== null;
  const want = (result.expected ?? "").trimEnd().split("\n");
  const lines = result.output.trimEnd().split("\n");
  const tone = !judged ? "border-line-strong" : passed ? "border-ok" : "border-bad";
  return (
    <div className={`flex min-w-0 flex-col border-t-2 bg-raised ${tone}`}>
      <span className="flex items-center justify-between gap-3 px-4 pt-3">
        <span className="label">Your output</span>
        <span className="flex items-center gap-3 text-sm">
          {result.timeMs !== null ? <span className="num text-faint">{result.timeMs} ms</span> : null}
          {judged ? <span className={`font-semibold ${VERDICT_TEXT[result.verdict!]}`}>{passed ? "Passed" : VERDICT_LABEL[result.verdict!]}</span> : null}
        </span>
      </span>
      <pre className="overflow-x-auto py-2 font-mono text-sm leading-6">
        {result.output === "" ? (
          <span className="block px-4 font-sans text-faint">No output</span>
        ) : (
          lines.map((line, i) => {
            const differs = result.verdict === "WRONG_ANSWER" && line.trim() !== (want[i] ?? "").trim();
            return (
              <span key={i} className={`block px-4 ${differs ? "bg-bad/15" : ""}`}>
                {line || " "}
              </span>
            );
          })
        )}
      </pre>
      {result.reason ? <p className="px-4 pb-2 text-sm text-bad">{result.reason}</p> : null}
      {result.stderr ? (
        <details className="px-4 pb-3">
          <summary className="cursor-pointer text-sm text-muted">Error output</summary>
          <pre className="mt-1 overflow-x-auto font-mono text-xs leading-5 text-muted">{result.stderr}</pre>
        </details>
      ) : null}
    </div>
  );
}
