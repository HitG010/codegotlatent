// Contests, from the API, or from sample data in the prototype build.
import type {
  ContestDetail,
  ContestListResponse,
  ContestPhase,
  ContestResults,
  ContestSummary,
  PercentileGuess,
} from "@cgl/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, API_URL } from "../lib/api";
import { useAuth, useUser } from "../lib/auth";
import { HISTORY, ME, ROUND_12, STANDINGS } from "../mock/data";

const live = API_URL !== undefined;
const path = (slug: string) => `/contests/${encodeURIComponent(slug)}`;

function useAuthSettled(): boolean {
  return useAuth().state.status !== "loading";
}

export function useContests() {
  const user = useUser();
  const settled = useAuthSettled();
  return useQuery({
    queryKey: ["contests", user?.id ?? null],
    enabled: settled,
    queryFn: async () => (live ? (await api<ContestListResponse>("/contests")).contests : sampleList()),
  });
}

// Refresh while things are moving: standings during the round, publication while judging
const POLL: Record<ContestPhase, number | false> = { SCHEDULED: 60_000, GUESS_WINDOW: 30_000, LIVE: 20_000, JUDGING: 5_000, RESULTS: false };

/** `preview` picks the sample contest's phase in the prototype; the API ignores it. */
export function useContest(slug: string, preview: ContestPhase = "GUESS_WINDOW") {
  const user = useUser();
  const settled = useAuthSettled();
  return useQuery({
    queryKey: ["contest", slug, user?.id ?? null, live ? null : preview],
    enabled: settled,
    queryFn: () => (live ? api<ContestDetail>(path(slug)) : Promise.resolve(sampleContest(preview))),
    refetchInterval: (query) => (live && query.state.data ? POLL[query.state.data.phase] : false),
  });
}

export function useContestResults(slug: string) {
  const user = useUser();
  const settled = useAuthSettled();
  return useQuery({
    queryKey: ["contest-results", slug, user?.id ?? null],
    enabled: settled,
    queryFn: () => (live ? api<ContestResults>(`${path(slug)}/results`) : Promise.resolve(sampleResults())),
  });
}

/** Registration and guesses. Each refreshes the contest afterwards. */
export function useContestActions(slug: string) {
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["contest", slug] }),
      queryClient.invalidateQueries({ queryKey: ["contests"] }),
    ]);
  return {
    register: async () => {
      if (live) await api(`${path(slug)}/registration`, { method: "POST" });
      else sample.registered = true;
      await refresh();
    },
    withdraw: async () => {
      if (live) await api(`${path(slug)}/registration`, { method: "DELETE" });
      else sample.registered = false;
      await refresh();
    },
    lockGuess: async (guess: PercentileGuess) => {
      if (live) await api(`${path(slug)}/guess`, { method: "PUT", body: JSON.stringify(guess) });
      else sample.guess = guess;
      await refresh();
    },
  };
}

// ─── Sample data for the prototype ─────────────────────────────────────────

const sample: { registered: boolean; guess: PercentileGuess | null } = { registered: true, guess: null };

function sampleList(): ContestSummary[] {
  const upcoming = sampleContest("SCHEDULED");
  const past = HISTORY.slice(0, -1)
    .reverse()
    .map((record, i): ContestSummary => {
      const startsAt = new Date(ROUND_12.startsAt.getTime() - (i + 1) * 14 * 24 * 3_600_000);
      return {
        slug: `round-${record.round}`,
        title: `Round ${record.round}`,
        phase: "RESULTS",
        guessOpensAt: new Date(startsAt.getTime() - 10 * 60_000).toISOString(),
        startsAt: startsAt.toISOString(),
        endsAt: new Date(startsAt.getTime() + 90 * 60_000).toISOString(),
        isRated: true,
        registered: record.field,
        problemCount: record.of,
        you: { registered: true, guess: record.guess },
      };
    });
  const { slug, title, phase, guessOpensAt, startsAt, endsAt, isRated, registered, problemCount, you } = upcoming;
  return [{ slug, title, phase, guessOpensAt, startsAt, endsAt, isRated, registered, problemCount, you }, ...past];
}

function sampleContest(phase: ContestPhase): ContestDetail {
  // Clocks are set relative to now so every phase has a running countdown
  const now = Date.now();
  const minute = 60_000;
  const startsAt =
    phase === "SCHEDULED" ? ROUND_12.startsAt.getTime() : phase === "GUESS_WINDOW" ? now + 7 * minute + 42_000 : now - 18 * minute + 33_000;
  const endsAt = startsAt + ROUND_12.durationMinutes * minute;
  const started = phase !== "SCHEDULED" && phase !== "GUESS_WINDOW";
  const statuses = ["solved", "solved", "attempted", null] as const;
  return {
    slug: ROUND_12.slug,
    title: ROUND_12.title,
    phase,
    guessOpensAt: new Date(startsAt - 10 * minute).toISOString(),
    startsAt: new Date(startsAt).toISOString(),
    endsAt: new Date(phase === "JUDGING" || phase === "RESULTS" ? now - minute : endsAt).toISOString(),
    isRated: true,
    registered: ROUND_12.registered,
    problemCount: ROUND_12.problems.length,
    you: { registered: sample.registered, guess: sample.guess ?? (started ? { best: 15, worst: 30 } : null) },
    descriptionHtml: null,
    rulesHtml: null,
    penaltyMinutes: ROUND_12.penaltyMinutes,
    maxParticipants: null,
    problems: started
      ? ROUND_12.problems.map((p, i) => ({ label: p.label, slug: p.slug, title: p.title, points: p.points, solvedBy: p.solvedBy, you: statuses[i] ?? null }))
      : null,
    standing: started ? { points: 1500, penaltyMinutes: 41, solved: 2 } : null,
  };
}

function sampleResults(): ContestResults {
  const mine = HISTORY[HISTORY.length - 1]!;
  const myRow = STANDINGS.find((r) => r.isMe)!;
  return {
    contest: {
      slug: ROUND_12.slug,
      title: ROUND_12.title,
      field: STANDINGS.length,
      isRated: true,
      problems: ROUND_12.problems.map(({ label, title, points }) => ({ label, title, points })),
    },
    you: {
      rank: myRow.rank,
      finish: mine.finish,
      guess: mine.guess,
      predictionScore: null,
      latent: { before: mine.latentAfter - mine.latentDelta, after: mine.latentAfter, delta: mine.latentDelta },
      form: { before: mine.formAfter - mine.formDelta, after: mine.formAfter, delta: mine.formDelta },
      points: myRow.score,
      solved: myRow.cells.filter((c) => c.solved).length,
      penaltyMinutes: myRow.penaltyMinutes,
    },
    rows: STANDINGS.map((row) => ({
      rank: row.rank,
      handle: row.isMe ? ME.handle : row.handle,
      you: row.isMe,
      points: row.score,
      penaltyMinutes: row.penaltyMinutes,
      cells: row.cells.map((cell, i) => ({ label: ROUND_12.problems[i]!.label, solved: cell.solved, wrongAttempts: cell.wrong, minute: cell.minute })),
      guess: row.guess,
      finish: row.finish,
      latentDelta: row.latentDelta,
      formDelta: row.formDelta,
    })),
  };
}
