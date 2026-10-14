// Player profiles, from the API, or from sample data in the prototype build.
import type { Language, UserProfile } from "@cgl/shared";
import { useQuery } from "@tanstack/react-query";
import { api, API_URL } from "../lib/api";
import { useAuth, useUser } from "../lib/auth";
import { HISTORY, ME, PRACTICE, PRACTICE_TOTALS, RECENT_SUBMISSIONS } from "../mock/data";

const live = API_URL !== undefined;

export function useProfile(handle: string) {
  const user = useUser();
  const settled = useAuth().state.status !== "loading";
  return useQuery({
    // Per viewer: your own profile shows more
    queryKey: ["profile", handle.toLowerCase(), user?.id ?? null],
    enabled: settled,
    queryFn: () => (live ? api<UserProfile>(`/users/${encodeURIComponent(handle)}`) : Promise.resolve(sampleProfile())),
  });
}

// ─── Sample data for the prototype ─────────────────────────────────────────

const LANGUAGE_OF: Record<string, Language> = { "C++": "cpp", Python: "python", Java: "java", JavaScript: "javascript" };

function sampleProfile(): UserProfile {
  const last = HISTORY[HISTORY.length - 1]!;
  const start = Date.now() - HISTORY.length * 14 * 24 * 3_600_000;
  return {
    handle: ME.handle,
    joinedAt: new Date(start - 30 * 24 * 3_600_000).toISOString(),
    you: true,
    latent: { rating: last.latentAfter, contests: HISTORY.length },
    form: { rating: last.formAfter, contests: HISTORY.length },
    contests: HISTORY.map((r, i) => ({
      slug: `round-${r.round}`,
      title: `Round ${r.round}`,
      startsAt: new Date(start + i * 14 * 24 * 3_600_000).toISOString(),
      field: r.field,
      rank: Math.max(1, Math.round((r.finish / 100) * r.field)),
      finish: r.finish,
      guess: r.guess,
      predictionScore: null,
      points: r.solved * 500,
      solved: r.solved,
      latent: { before: r.latentAfter - r.latentDelta, after: r.latentAfter, delta: r.latentDelta },
      form: { before: r.formAfter - r.formDelta, after: r.formAfter, delta: r.formDelta },
    })),
    practice: {
      EASY: { solved: PRACTICE.filter((p) => p.difficulty === "EASY" && p.status === "solved").length, total: PRACTICE_TOTALS.EASY },
      MEDIUM: { solved: PRACTICE.filter((p) => p.difficulty === "MEDIUM" && p.status === "solved").length, total: PRACTICE_TOTALS.MEDIUM },
      HARD: { solved: PRACTICE.filter((p) => p.difficulty === "HARD" && p.status === "solved").length, total: PRACTICE_TOTALS.HARD },
    },
    recentSubmissions: RECENT_SUBMISSIONS.map((s, i) => ({
      id: s.id,
      problemSlug: s.problemSlug,
      problemTitle: s.problem,
      language: LANGUAGE_OF[s.language] ?? "cpp",
      status: "FINISHED",
      verdict: s.verdict,
      createdAt: new Date(Date.now() - (i + 1) * 9 * 3_600_000).toISOString(),
    })),
  };
}
