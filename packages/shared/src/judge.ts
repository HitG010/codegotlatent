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

export const LANGUAGES = {
  cpp: { label: "C++", judge0Id: 54 },
  python: { label: "Python", judge0Id: 71 },
  javascript: { label: "JavaScript", judge0Id: 63 },
  java: { label: "Java", judge0Id: 62 },
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
