import { z } from "zod";

export const VERDICTS = [
  "ACCEPTED",
  "WRONG_ANSWER",
  "TIME_LIMIT_EXCEEDED",
  "MEMORY_LIMIT_EXCEEDED",
  "RUNTIME_ERROR",
  "COMPILATION_ERROR",
  "INTERNAL_ERROR",
] as const;

export const verdictSchema = z.enum(VERDICTS);
export type Verdict = z.infer<typeof verdictSchema>;

// A submission is QUEUED on creation, RUNNING once a worker picks it up,
// and FINISHED when every test has a result (the verdict is then set).
export const SUBMISSION_STATUSES = ["QUEUED", "RUNNING", "FINISHED"] as const;
export const submissionStatusSchema = z.enum(SUBMISSION_STATUSES);
export type SubmissionStatus = z.infer<typeof submissionStatusSchema>;

// timeMultiplier scales a problem's time limit, which is set for C++
export const LANGUAGES = {
  cpp: { label: "C++", judge0Id: 54, timeMultiplier: 1 },
  python: { label: "Python", judge0Id: 71, timeMultiplier: 3 },
  javascript: { label: "JavaScript", judge0Id: 63, timeMultiplier: 2 },
  java: { label: "Java", judge0Id: 62, timeMultiplier: 2 },
} as const;

export type Language = keyof typeof LANGUAGES;
export const languageSchema = z.enum(
  Object.keys(LANGUAGES) as [Language, ...Language[]],
);

export function languageFromJudge0Id(id: number): Language | undefined {
  return (Object.keys(LANGUAGES) as Language[]).find(
    (lang) => LANGUAGES[lang].judge0Id === id,
  );
}

/**
 * How a test's output is compared with its answer file. Mirrors the default
 * output validator of the ICPC problem package format: token by token,
 * ignoring whitespace and case unless told otherwise, with optional float
 * tolerances.
 */
export const checkerSchema = z.object({
  kind: z.literal("default"),
  caseSensitive: z.boolean(),
  spaceSensitive: z.boolean(),
  floatAbsoluteTolerance: z.number().positive().optional(),
  floatRelativeTolerance: z.number().positive().optional(),
});

export type Checker = z.infer<typeof checkerSchema>;
