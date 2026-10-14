import { z } from "zod";
import type { Db } from "../db.js";

const UNITS: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/** "90m", "1h30m", "2h" → milliseconds. */
export function parseDuration(text: string): number {
  const parts = [...text.trim().matchAll(/(\d+)\s*([smhd])/g)];
  if (parts.length === 0 || parts.map((p) => p[0]).join("") !== text.trim().replace(/\s+/g, "")) {
    throw new Error(`Can't read "${text}" as a duration; use something like 90m or 1h30m`);
  }
  return parts.reduce((total, [, n, unit]) => total + Number(n) * UNITS[unit!]!, 0);
}

const duration = z.string().transform((text, ctx) => {
  try {
    return parseDuration(text);
  } catch (error) {
    ctx.addIssue({ code: "custom", message: (error as Error).message });
    return z.NEVER;
  }
});

export const contestSpecSchema = z.strictObject({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, digits and single hyphens").max(60),
  title: z.string().min(1).max(80),
  description: z.string().optional(),
  rules: z.string().optional(),
  /** An ISO date, or relative: "in 10m". */
  starts: z.union([z.date(), z.string()]),
  duration,
  /** How long before the start registration closes and guesses open. */
  guess_window: duration.default(30 * 60_000),
  penalty_minutes: z.number().int().min(0).max(60).default(5),
  rated: z.boolean().default(true),
  max_participants: z.number().int().positive().nullable().default(null),
  problems: z
    .array(z.strictObject({ slug: z.string(), label: z.string().regex(/^[A-Z][0-9]?$/), points: z.number().int().positive() }))
    .min(1)
    .refine((ps) => new Set(ps.map((p) => p.label)).size === ps.length, "Problem labels must be unique")
    .refine((ps) => new Set(ps.map((p) => p.slug)).size === ps.length, "A problem can only appear once"),
});

export type ContestSpec = z.input<typeof contestSpecSchema>;

function startTime(starts: Date | string, now: Date): Date {
  if (starts instanceof Date) return starts;
  const relative = /^in\s+(.+)$/.exec(starts.trim());
  const date = relative ? new Date(now.getTime() + parseDuration(relative[1]!)) : new Date(starts);
  if (Number.isNaN(date.getTime())) throw new Error(`Can't read "${starts}" as a start time; use an ISO date or "in 10m"`);
  return date;
}

/**
 * Schedules a contest from a spec. Its problems should be unreleased; a
 * problem that's already in practice still works (it's hidden from practice
 * from the guess window until results), but its solutions may be out there.
 */
export async function createContest(db: Db, input: ContestSpec, now: Date = new Date()): Promise<{ id: string; warnings: string[] }> {
  const spec = contestSpecSchema.parse(input);
  const startsAt = startTime(spec.starts, now);
  if (startsAt <= now) throw new Error("The contest has to start in the future");
  const guessOpensAt = new Date(startsAt.getTime() - spec.guess_window);
  const endsAt = new Date(startsAt.getTime() + spec.duration);

  const problems = await db.problem.findMany({
    where: { slug: { in: spec.problems.map((p) => p.slug) } },
    select: { id: true, slug: true, publishedAt: true, currentVersionId: true },
  });
  const bySlug = new Map(problems.map((p) => [p.slug, p]));
  const warnings: string[] = [];
  for (const { slug } of spec.problems) {
    const problem = bySlug.get(slug);
    if (!problem?.currentVersionId) throw new Error(`No imported problem "${slug}"; run problems:import first`);
    if (problem.publishedAt) warnings.push(`${slug} is already in practice; solutions to it may be public`);
  }

  const contest = await db.contest.create({
    data: {
      slug: spec.slug,
      title: spec.title,
      description: spec.description ?? null,
      rules: spec.rules ?? null,
      isRated: spec.rated,
      guessOpensAt,
      startsAt,
      endsAt,
      maxParticipants: spec.max_participants,
      penaltyMinutes: spec.penalty_minutes,
      problems: { create: spec.problems.map((p) => ({ problemId: bySlug.get(p.slug)!.id, label: p.label, points: p.points })) },
    },
    select: { id: true },
  });
  return { id: contest.id, warnings };
}
