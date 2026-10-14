import { checkOutput } from "@cgl/problem-package/checker";
import { type Checker, LANGUAGES, type Language, type Verdict } from "@cgl/shared";
import type { GoJudge, SandboxResult } from "./gojudge.js";

interface LanguageSetup {
  source: string;
  /** Null for interpreted languages, which run the source directly. */
  compile: { args: string[]; artifact: string } | null;
  run: (memoryMb: number) => string[];
  /** Runtimes like the JVM need memory beyond what the program itself may use. */
  memoryOverheadMb: number;
  procLimit: number;
}

const SETUP: Record<Language, LanguageSetup> = {
  cpp: {
    source: "main.cpp",
    compile: { args: ["/usr/bin/g++", "-O2", "-std=c++17", "-o", "main", "main.cpp"], artifact: "main" },
    run: () => ["main"],
    memoryOverheadMb: 0,
    procLimit: 1,
  },
  python: {
    source: "main.py",
    compile: null,
    run: () => ["/usr/bin/python3", "main.py"],
    memoryOverheadMb: 16,
    procLimit: 1,
  },
  javascript: {
    source: "main.js",
    compile: null,
    run: (memoryMb) => ["/usr/bin/node", `--max-old-space-size=${memoryMb}`, "main.js"],
    memoryOverheadMb: 64,
    procLimit: 16,
  },
  java: {
    source: "Main.java",
    // Bundling into a jar keeps inner classes together as one cached artifact
    compile: { args: ["/bin/sh", "-c", "javac -J-Xmx512m Main.java && jar cf main.jar *.class"], artifact: "main.jar" },
    run: (memoryMb) => ["/usr/bin/java", `-Xmx${memoryMb}m`, "-Xss64m", "-cp", "main.jar", "Main"],
    memoryOverheadMb: 128,
    procLimit: 64,
  },
};

export interface TestCase {
  input: string;
  answer: string;
}

export interface Limits {
  /** The problem's limit, for C++; other languages get LANGUAGES[*].timeMultiplier. */
  timeLimitMs: number;
  memoryLimitMb: number;
}

export interface CaseOutcome {
  verdict: Verdict;
  timeMs: number;
  memoryKb: number;
  stdout: string;
  stderr: string;
  /** The checker's explanation of a wrong answer. */
  reason: string | null;
}

export type Execution = { compileError: string } | { compileError: null; outcomes: CaseOutcome[] };

function verdictFor(result: SandboxResult): Verdict | null {
  switch (result.status) {
    case "Accepted":
      return null; // ran cleanly: the checker decides
    case "Time Limit Exceeded":
      return "TIME_LIMIT_EXCEEDED";
    case "Memory Limit Exceeded":
      return "MEMORY_LIMIT_EXCEEDED";
    case "Output Limit Exceeded":
      return "WRONG_ANSWER";
    case "Nonzero Exit Status":
    case "Signalled":
      return "RUNTIME_ERROR";
    default:
      return "INTERNAL_ERROR";
  }
}

/**
 * Compiles once, then runs each test in order and checks its output. With
 * stopOnFailure, judging ends at the first test that doesn't pass, like the
 * real judge. `onOutcome` reports each test as it finishes.
 */
export async function execute(
  sandbox: GoJudge,
  options: {
    language: Language;
    code: string;
    tests: TestCase[];
    limits: Limits;
    checker: Checker | null;
    stopOnFailure: boolean;
    onOutcome?: (outcome: CaseOutcome, index: number) => Promise<void> | void;
  },
): Promise<Execution> {
  const setup = SETUP[options.language];
  const cpuMs = Math.round(options.limits.timeLimitMs * LANGUAGES[options.language].timeMultiplier);
  const memoryMb = options.limits.memoryLimitMb;

  let copyIn: Record<string, { content: string } | { fileId: string }> = { [setup.source]: { content: options.code } };
  let cached: string | null = null;

  if (setup.compile) {
    const compiled = await sandbox.run({
      args: setup.compile.args,
      stdin: "",
      copyIn,
      cpuMs: 15_000,
      memoryMb: 1024,
      procLimit: 64,
      stdoutMaxBytes: 16 * 1024,
      copyOutCached: [setup.compile.artifact],
    });
    const artifact = compiled.fileIds[setup.compile.artifact];
    if (compiled.status !== "Accepted" || !artifact) {
      const output = `${compiled.stdout}${compiled.stderr}`.trim();
      return { compileError: output || `Compilation failed (${compiled.status})` };
    }
    cached = artifact;
    copyIn = { [setup.compile.artifact]: { fileId: artifact } };
  }

  try {
    const outcomes: CaseOutcome[] = [];
    for (const [index, test] of options.tests.entries()) {
      const result = await sandbox.run({
        args: setup.run(memoryMb),
        stdin: test.input,
        copyIn,
        cpuMs,
        memoryMb: memoryMb + setup.memoryOverheadMb,
        procLimit: setup.procLimit,
        stdoutMaxBytes: Math.max(64 * 1024, test.answer.length * 2 + 1024),
      });
      let verdict = verdictFor(result);
      let reason: string | null = null;
      if (verdict === null) {
        if (options.checker) {
          const check = checkOutput(test.answer, result.stdout, options.checker);
          verdict = check.accepted ? "ACCEPTED" : "WRONG_ANSWER";
          reason = check.accepted ? null : check.reason;
        } else {
          verdict = "ACCEPTED";
        }
      }
      const outcome = { verdict, timeMs: result.timeMs, memoryKb: result.memoryKb, stdout: result.stdout, stderr: result.stderr, reason };
      outcomes.push(outcome);
      await options.onOutcome?.(outcome, index);
      if (options.stopOnFailure && verdict !== "ACCEPTED") break;
    }
    return { compileError: null, outcomes };
  } finally {
    if (cached) await sandbox.release(cached);
  }
}
