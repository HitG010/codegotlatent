import { checkOutput } from "@cgl/problem-package/checker";
import { LANGUAGES, type Language, type Verdict } from "@cgl/shared";
import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Link } from "react-router";
import { AccountMenu, ThemeButton } from "../components/AppShell";
import { CodeEditor } from "../components/CodeEditor";
import { Wordmark } from "../components/show";
import { Button, Icon, VERDICT_LABEL, VERDICT_TEXT, VerdictChip } from "../components/ui";
import { RECENT_SUBMISSIONS } from "../mock/data";
import PROBLEM from "../mock/self-aware.json";

const STARTER: Record<Language, string> = {
  cpp: `#include <cstdio>
#include <cstdlib>

int main() {
    int n, k;
    std::scanf("%d %d", &n, &k);
    int count = 0;
    for (int i = 0; i < n; i++) {
        int g, r;
        std::scanf("%d %d", &g, &r);
        // count contestants whose guess was within k
    }
    std::printf("%d\\n", count);
}
`,
  python: `import sys

def main():
    data = sys.stdin.read().split()
    n, k = int(data[0]), int(data[1])
    count = 0
    # count contestants whose guess was within k
    print(count)

main()
`,
  javascript: `const data = require("fs").readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);
const [n, k] = data;
let count = 0;
// count contestants whose guess was within k
console.log(count);
`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt(), k = in.nextInt();
        int count = 0;
        // count contestants whose guess was within k
        System.out.println(count);
    }
}
`,
};

const CHECKER = { kind: "default", caseSensitive: false, spaceSensitive: false } as const;
const TEST_COUNT = PROBLEM.samples.length + PROBLEM.secretTestCount;

type TestState = "waiting" | "running" | Verdict;
interface Judging {
  kind: "run" | "submit";
  tests: TestState[];
  outputs: string[];
  done: boolean;
}

// Prototype only: pretends to compile and run. A solution that takes an
// absolute difference passes; anything else prints its starting count.
function simulateOutput(code: string, sampleIndex: number): string {
  return /abs\s*\(/.test(code) ? PROBLEM.samples[sampleIndex]!.output : "0\n";
}

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
  const [language, setLanguage] = useState<Language>("cpp");
  const [code, setCode] = useState(STARTER.cpp);
  const [leftTab, setLeftTab] = useState<"statement" | "editorial" | "submissions">("statement");
  const [mobileTab, setMobileTab] = useState<"problem" | "code" | "tests">("problem");
  const [testTab, setTestTab] = useState(0);
  const [judging, setJudging] = useState<Judging | null>(null);
  const timers = useRef<number[]>([]);
  const horizontal = useSplit(44, "x", 28, 70);
  const vertical = useSplit(230, "y", 120, 480);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const judge = useCallback(
    (kind: "run" | "submit") => {
      timers.current.forEach(clearTimeout);
      const count = kind === "run" ? PROBLEM.samples.length : TEST_COUNT;
      const tests: TestState[] = Array.from({ length: count }, () => "waiting");
      setJudging({ kind, tests, outputs: [], done: false });
      if (kind === "run") setMobileTab("tests");

      const correct = /abs\s*\(/.test(code);
      for (let i = 0; i < count; i++) {
        timers.current.push(
          window.setTimeout(() => setJudging((j) => j && { ...j, tests: j.tests.map((s, n) => (n === i ? "running" : s)) }), 250 + i * 320),
          window.setTimeout(() => {
            const sample = i < PROBLEM.samples.length;
            const output = sample ? simulateOutput(code, i) : "";
            const pass = sample ? checkOutput(PROBLEM.samples[i]!.output, output, CHECKER).accepted : correct;
            const verdict: Verdict = pass ? "ACCEPTED" : "WRONG_ANSWER";
            const stop = kind === "submit" && !pass;
            setJudging((j) => {
              if (!j) return j;
              const outputs = [...j.outputs];
              if (sample) outputs[i] = output;
              // A submission stops at the first failing test, like the real judge
              const states = j.tests.map((s, n) => (n === i ? verdict : stop && n > i ? "waiting" : s));
              return { ...j, tests: states, outputs, done: stop || i === count - 1 };
            });
            if (stop) timers.current.forEach(clearTimeout);
          }, 520 + i * 320),
        );
      }
    },
    [code],
  );

  const changeLanguage = (next: Language) => {
    setLanguage(next);
    setCode(STARTER[next]);
  };

  const statusLine = judging ? <JudgeStatus judging={judging} /> : null;

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
      <Button size="sm" onClick={() => judge("run")} shortcut="⌘'" aria-keyshortcuts="Meta+'">
        <Icon name="play" className="size-3.5" /> Run
      </Button>
      <Button size="sm" variant="primary" onClick={() => judge("submit")} shortcut="⌘↵" aria-keyshortcuts="Meta+Enter">
        Submit
      </Button>
    </div>
  );

  const editor = (
    <CodeEditor
      language={language}
      initialCode={STARTER[language]}
      documentKey={language}
      onChange={setCode}
      onRun={() => judge("run")}
      onSubmit={() => judge("submit")}
    />
  );

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line px-3 sm:px-4">
        <Link to="/problems" className="flex items-center gap-2 text-sm text-muted hover:text-fg" aria-label="Back to problems">
          <Wordmark compact />
        </Link>
        <span className="text-faint">/</span>
        <Link to="/problems" className="hidden text-sm text-muted hover:text-fg sm:inline">
          Problems
        </Link>
        <span className="hidden text-faint sm:inline">/</span>
        <h1 className="truncate text-base font-semibold">{PROBLEM.title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:block">{toolbar}</div>
          <ThemeButton />
          <div className="hidden sm:block">
            <AccountMenu />
          </div>
        </div>
      </header>

      {/* Desktop: statement | editor over tests */}
      <div ref={horizontal.container} className="hidden min-h-0 flex-1 md:flex">
        <section className="flex min-w-0 flex-col" style={{ width: `${horizontal.size}%` }}>
          <ProblemTabs tab={leftTab} onTab={setLeftTab} />
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
            <TestsPanel judging={judging} testTab={testTab} onTestTab={setTestTab} statusLine={statusLine} />
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
          {mobileTab === "problem" ? <ProblemTabs tab={leftTab} onTab={setLeftTab} /> : null}
          {mobileTab === "code" ? editor : null}
          {mobileTab === "tests" ? <TestsPanel judging={judging} testTab={testTab} onTestTab={setTestTab} statusLine={statusLine} /> : null}
        </div>
        <div className="flex shrink-0 justify-end border-t border-line px-3 py-2 pb-[max(8px,env(safe-area-inset-bottom,0px))]">
          {toolbar}
        </div>
      </div>
    </div>
  );
}

function ProblemTabs({ tab, onTab }: { tab: "statement" | "editorial" | "submissions"; onTab: (t: "statement" | "editorial" | "submissions") => void }) {
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
        {tab === "statement" ? <Statement /> : null}
        {tab === "editorial" && PROBLEM.editorialHtml ? (
          <div className="statement" dangerouslySetInnerHTML={{ __html: PROBLEM.editorialHtml }} />
        ) : null}
        {tab === "submissions" ? <SubmissionsList /> : null}
      </div>
    </>
  );
}

function Statement() {
  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <span className="label">Round 12 · Problem A</span>
        <h2 className="text-xl font-semibold">{PROBLEM.title}</h2>
        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
          <div className="flex gap-1.5">
            <dt>Time</dt>
            <dd className="num text-fg">{PROBLEM.timeLimitMs / 1000} s</dd>
          </div>
          <div className="flex gap-1.5">
            <dt>Memory</dt>
            <dd className="num text-fg">{PROBLEM.memoryLimitMb} MB</dd>
          </div>
          <div className="flex gap-1.5">
            <dt>Tags</dt>
            <dd className="text-fg">{PROBLEM.tags.join(", ")}</dd>
          </div>
        </dl>
      </header>
      {/* Sanitised when the problem was published */}
      <div className="statement" dangerouslySetInnerHTML={{ __html: PROBLEM.statementHtml }} />
      <section className="flex max-w-[68ch] flex-col gap-4">
        <h3 className="text-md font-semibold">Samples</h3>
        {PROBLEM.samples.map((sample, i) => (
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
      <pre className="overflow-x-auto px-3 py-2.5 font-mono text-sm leading-5">{text}</pre>
    </div>
  );
}

function SubmissionsList() {
  const mine = RECENT_SUBMISSIONS.filter((s) => s.problemSlug === PROBLEM.slug);
  return (
    <ul className="flex flex-col">
      {mine.map((s) => (
        <li key={s.id} className="flex items-center gap-4 border-b border-line py-3 text-sm">
          <VerdictChip verdict={s.verdict} />
          <span className="text-muted">{s.language}</span>
          <span className="num text-muted">{s.timeMs === null ? "—" : `${s.timeMs} ms`}</span>
          <span className="ml-auto text-faint">{s.ago}</span>
        </li>
      ))}
    </ul>
  );
}

function JudgeStatus({ judging }: { judging: Judging }) {
  const failedAt = judging.tests.findIndex((s) => s !== "waiting" && s !== "running" && s !== "ACCEPTED");
  const passed = judging.tests.filter((s) => s === "ACCEPTED").length;
  const verdict: Verdict | null = !judging.done ? null : failedAt >= 0 ? (judging.tests[failedAt] as Verdict) : "ACCEPTED";
  return (
    <div className="flex min-w-0 items-center gap-3" aria-live="polite">
      <span className="flex items-center gap-1" aria-hidden="true">
        {judging.tests.map((state, i) => (
          <span
            key={i}
            className={`size-2 rounded-[2px] ${
              state === "waiting" ? "bg-line-strong" : state === "running" ? "bg-fg tally" : state === "ACCEPTED" ? "bg-ok" : "bg-bad"
            }`}
          />
        ))}
      </span>
      {verdict ? (
        <span className={`truncate text-sm font-semibold ${VERDICT_TEXT[verdict]}`}>
          {VERDICT_LABEL[verdict]}
          {verdict === "ACCEPTED"
            ? judging.kind === "submit"
              ? " · all tests passed"
              : " on samples"
            : ` on test ${failedAt + 1}${failedAt >= PROBLEM.samples.length ? " (hidden)" : ""}`}
        </span>
      ) : (
        <span className="num truncate text-sm text-muted">
          {judging.kind === "run" ? "Running samples" : "Judging"} · {passed}/{judging.tests.length}
        </span>
      )}
    </div>
  );
}

function TestsPanel({ judging, testTab, onTestTab, statusLine }: { judging: Judging | null; testTab: number; onTestTab: (i: number) => void; statusLine: ReactNode }) {
  const sample = PROBLEM.samples[testTab]!;
  const output = judging?.outputs[testTab];
  const result = output === undefined ? null : checkOutput(sample.output, output, CHECKER);
  return (
    <div className="flex h-full min-h-0 flex-col bg-raised">
      <div className="flex h-10 shrink-0 items-center gap-4 border-b border-line px-4">
        <div role="tablist" aria-label="Sample tests" className="flex h-full items-end gap-4">
          {PROBLEM.samples.map((_, i) => {
            const state = judging?.kind === "run" ? judging.tests[i] : undefined;
            return (
              <button
                key={i}
                role="tab"
                aria-selected={testTab === i}
                onClick={() => onTestTab(i)}
                className={`flex h-10 items-center gap-1.5 text-sm ${testTab === i ? "text-fg font-semibold shadow-[inset_0_-2px_0_var(--fg)]" : "text-muted hover:text-fg"}`}
              >
                {state === "ACCEPTED" ? <span className="size-1.5 rounded-full bg-ok" /> : state === "WRONG_ANSWER" ? <span className="size-1.5 rounded-full bg-bad" /> : null}
                Sample {i + 1}
              </button>
            );
          })}
        </div>
        <div className="ml-auto min-w-0">{statusLine}</div>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-px overflow-y-auto bg-line sm:grid-cols-3">
        <IoBlock title="Input" text={sample.input} />
        <IoBlock title="Expected" text={sample.output} />
        {output === undefined ? (
          <IoBlock title="Your output" text={judging?.kind === "run" && !judging.done ? "Running…" : "Run your code to see its output here."} muted />
        ) : (
          <OutputBlock expected={sample.output} output={output} passed={result!.accepted} reason={result!.accepted ? null : result!.reason} />
        )}
      </div>
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

/** Your output, with the verdict up top and differing lines marked. */
function OutputBlock({ expected, output, passed, reason }: { expected: string; output: string; passed: boolean; reason: string | null }) {
  const want = expected.trimEnd().split("\n");
  const lines = output.trimEnd().split("\n");
  return (
    <div className={`flex min-w-0 flex-col border-t-2 bg-raised ${passed ? "border-ok" : "border-bad"}`}>
      <span className="flex items-center justify-between px-4 pt-3">
        <span className="label">Your output</span>
        <span className={`text-sm font-semibold ${passed ? "text-ok" : "text-bad"}`}>{passed ? "Passed" : "Wrong answer"}</span>
      </span>
      <pre className="overflow-x-auto py-2 font-mono text-sm leading-6">
        {lines.map((line, i) => {
          const differs = !passed && line.trim() !== (want[i] ?? "").trim();
          return (
            <span key={i} className={`block px-4 ${differs ? "bg-bad/15" : ""}`}>
              {line || " "}
            </span>
          );
        })}
      </pre>
      {reason ? <p className="px-4 pb-3 text-sm text-bad">{reason}</p> : null}
    </div>
  );
}
