import type { ContestDetail, ContestPhase, PercentileGuess } from "@cgl/shared";
import { type ReactNode, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { missBy, RangeMark, RangeRuler, ScoringDetails } from "../components/Range";
import { Countdown, PhaseBar, Tally } from "../components/show";
import { Button, ButtonLink, Icon, Segmented } from "../components/ui";
import { useContest, useContestActions } from "../data/contests";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { duration, showTime } from "../lib/format";
import { HISTORY } from "../mock/data";

const PHASE_OPTIONS = [
  { value: "SCHEDULED", label: "Registration" },
  { value: "GUESS_WINDOW", label: "Guess window" },
  { value: "LIVE", label: "Live" },
  { value: "JUDGING", label: "Judging" },
  { value: "RESULTS", label: "Results" },
] as const satisfies readonly { value: ContestPhase; label: string }[];

const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const minutesBetween = (from: string, to: string) => Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000);

export function ContestLobby() {
  const { slug = "" } = useParams();
  const { live } = useAuth();
  const [preview, setPreview] = useState<ContestPhase>("GUESS_WINDOW");
  const query = useContest(slug, preview);
  const contest = query.data;

  // The phase follows the clock: fetch again as soon as the next boundary passes
  useEffect(() => {
    if (!live || !contest) return;
    const now = Date.now();
    const next = [contest.guessOpensAt, contest.startsAt, contest.endsAt].map((t) => new Date(t).getTime()).find((t) => t > now);
    if (next === undefined || next - now > 24 * 3_600_000) return;
    const timer = setTimeout(() => void query.refetch(), next - now + 500);
    return () => clearTimeout(timer);
  }, [live, contest, query]);

  if (query.isPending) return <div className="gutter mx-auto max-w-[1240px] py-10 text-base text-muted">Loading contest…</div>;
  if (query.isError || !contest) {
    const missing = query.error instanceof ApiError && query.error.status === 404;
    return (
      <div className="gutter mx-auto flex max-w-[1240px] flex-col gap-3 py-10 text-base text-muted">
        {missing ? "There's no contest here." : "Couldn't load this contest."}
        <Link to="/contests" className="text-fg underline underline-offset-4">
          All contests
        </Link>
      </div>
    );
  }

  const phase = contest.phase;
  const marks: Record<ContestPhase, string> = {
    SCHEDULED: phase === "SCHEDULED" ? "Open now" : "Closed",
    GUESS_WINDOW: clock(contest.guessOpensAt),
    LIVE: clock(contest.startsAt),
    JUDGING: clock(contest.endsAt),
    RESULTS: phase === "RESULTS" ? "Out now" : "After judging",
  };

  return (
    <div className="gutter mx-auto flex max-w-[1240px] flex-col gap-8 py-10">
      {live ? null : (
        <div className="flex flex-col gap-3 rounded-md border border-dashed border-line-strong p-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted">
            <span className="label mr-2">Prototype</span>Preview this page in each phase of the round.
          </span>
          <div className="overflow-x-auto">
            <Segmented label="Preview phase" options={PHASE_OPTIONS} value={preview} onChange={setPreview} />
          </div>
        </div>
      )}

      {/* The contest's title card, on the stage colour */}
      <header className="flex flex-col overflow-hidden rounded-md bg-stage text-stage-fg">
        <div className="flex flex-wrap items-end justify-between gap-6 p-6 sm:p-8">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-stage-muted">{contest.isRated ? "Rated contest" : "Unrated contest"}</span>
            <h1 className="display text-4xl">{contest.title}</h1>
          </div>
          <dl className="flex flex-wrap gap-x-8 gap-y-2">
            {[
              { label: "Starts", value: showTime(new Date(contest.startsAt)) },
              { label: "Length", value: duration(minutesBetween(contest.startsAt, contest.endsAt)) },
              { label: "Problems", value: String(contest.problemCount) },
              { label: "Registered", value: String(contest.registered) },
            ].map((item) => (
              <div key={item.label} className="flex flex-col">
                <dt className="text-sm text-stage-muted">{item.label}</dt>
                <dd className="text-md font-medium">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <PhaseBar phase={phase} marks={marks} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {phase === "SCHEDULED" ? <Registration contest={contest} /> : null}
          {phase === "GUESS_WINDOW" ? <GuessWindow contest={contest} /> : null}
          {phase === "LIVE" ? <Live contest={contest} /> : null}
          {phase === "JUDGING" ? <Judging contest={contest} /> : null}
          {phase === "RESULTS" ? <Results contest={contest} /> : null}
        </div>
        <aside className="flex flex-col gap-8">
          {contest.descriptionHtml ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-base font-semibold">About</h2>
              {/* Sanitised by the API */}
              <div className="statement text-base text-muted" dangerouslySetInnerHTML={{ __html: contest.descriptionHtml }} />
            </section>
          ) : null}
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold">How your guess is scored</h2>
            <p className="text-base text-muted">
              If you finish inside your range, your score is its width. Each percentile you finish outside adds 10.
              Lower is better. Latent compares your score with everyone else's.
            </p>
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold">Rules</h2>
            {contest.rulesHtml ? (
              <div className="statement text-base text-muted" dangerouslySetInnerHTML={{ __html: contest.rulesHtml }} />
            ) : (
              <ul className="flex flex-col gap-2 text-base text-muted">
                <li>AI tools are allowed.</li>
                <li>Only registered contestants can open the problems while the contest is live.</li>
                <li>
                  Wrong attempts before an accept cost <span className="num text-fg">{contest.penaltyMinutes}</span> minutes each.
                </li>
                <li>Standings are hidden until results are published.</li>
                <li>Ties share a rank.</li>
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

/** Runs an action, holding a busy flag and the API's error message. */
function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function Registration({ contest }: { contest: ContestDetail }) {
  const actions = useContestActions(contest.slug);
  const { busy, error, run } = useAction();
  const windowMinutes = minutesBetween(contest.guessOpensAt, contest.startsAt);
  const full = contest.maxParticipants !== null && contest.registered >= contest.maxParticipants;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="label">Guess window opens in</span>
        <Countdown to={new Date(contest.guessOpensAt)} className="text-3xl font-semibold tracking-tight" />
      </div>
      <p className="max-w-[56ch] text-md text-muted">
        {duration(windowMinutes)} before the start you'll call your range, before you've seen a single problem. Registration
        closes when that window opens, and only registered contestants can open the problems during the round.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {contest.you === null ? (
          <ButtonLink to="/" variant="primary" size="lg">
            Sign in to register
          </ButtonLink>
        ) : contest.you.registered ? (
          <>
            <span className="inline-flex h-11 items-center gap-2 text-md font-semibold text-ok">
              <Icon name="check" /> You're registered
            </span>
            <Button variant="ghost" disabled={busy} onClick={() => void run(actions.withdraw)}>
              Withdraw
            </Button>
          </>
        ) : full ? (
          <span className="text-md text-muted">This contest is full.</span>
        ) : (
          <Button variant="primary" size="lg" disabled={busy} onClick={() => void run(actions.register)}>
            {busy ? "Registering…" : `Register for ${contest.title}`}
          </Button>
        )}
      </div>
      {error ? <p className="text-sm text-bad">{error}</p> : null}
    </section>
  );
}

function NotRegistered({ children }: { children: ReactNode }) {
  return (
    <div className="flex max-w-[60ch] flex-col gap-2 rounded-md border border-line p-5">
      <span className="inline-flex items-center gap-2 text-md font-semibold">
        <Icon name="lock" className="size-4 text-signal-fg" /> You're not registered for this round
      </span>
      <p className="text-base text-muted">{children}</p>
    </div>
  );
}

function GuessWindow({ contest }: { contest: ContestDetail }) {
  const { live } = useAuth();
  const actions = useContestActions(contest.slug);
  const { busy, error, run } = useAction();
  const saved = contest.you?.guess ?? null;
  const [guess, setGuess] = useState<PercentileGuess>(saved ?? { best: 15, worst: 30 });
  const [editing, setEditing] = useState(saved === null);
  const locked = saved !== null && !editing;

  if (!contest.you?.registered) {
    return (
      <NotRegistered>
        Registration closed when the guess window opened. During the round only registered contestants can open the problems;
        they join practice once results are out.
      </NotRegistered>
    );
  }

  // Only the prototype has a history to show; the real one arrives with profiles
  const recent = live ? [] : HISTORY.slice(-4, -1).reverse();

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-xl font-semibold">Guess your rank</h2>
          <p className="text-base text-muted">
            Where will you finish among <span className="num text-fg">{contest.registered}</span> people? Pick a range you're about 80% sure of.
          </p>
        </div>
        <div className="flex items-center gap-2.5 rounded-sm border border-line px-3 py-2">
          <Tally tone="signal" />
          <span className="text-sm text-muted">Locks in</span>
          <Countdown to={new Date(contest.startsAt)} className="text-md font-semibold" />
        </div>
      </div>

      <div className={`rounded-md border p-5 sm:p-6 ${locked ? "border-line" : "border-line-strong bg-raised"}`}>
        <RangeRuler id={`${contest.slug}-guess`} value={guess} fieldSize={contest.registered} {...(locked ? {} : { onChange: setGuess })} />
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          {locked ? (
            <>
              <span className="inline-flex items-center gap-2 text-base">
                <Icon name="lock" className="size-4 text-signal-fg" />
                Locked in at <span className="font-semibold">top {saved.best}–{saved.worst}%</span>. You can change it until the window closes.
              </span>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Change
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm text-muted">If you submit without a guess, you lose 15 Latent.</span>
              <Button
                variant="primary"
                size="lg"
                disabled={busy}
                onClick={() => void run(() => actions.lockGuess(guess)).then((ok) => ok && setEditing(false))}
              >
                <Icon name="lock" /> {busy ? "Locking…" : "Lock it in"}
              </Button>
            </>
          )}
        </div>
        {error ? <p className="mt-3 text-sm text-bad">{error}</p> : null}
      </div>

      <ScoringDetails guess={guess} />

      {recent.length ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-md font-semibold">Your last three guesses</h3>
          <ul className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3">
            {recent.map((record) => {
              const miss = missBy(record.guess, record.finish);
              return (
                <li key={record.round} className="flex flex-col gap-2.5 bg-raised p-4">
                  <span className="text-sm font-medium">Round {record.round}</span>
                  <RangeMark guess={record.guess} finish={record.finish} you />
                  <span className="text-sm text-muted">
                    Guessed top {record.guess.best}–{record.guess.worst}%, finished top {record.finish}%{" "}
                    <span className={miss === 0 ? "text-ok" : "text-bad"}>{miss === 0 ? "· inside" : `· ${miss} pts outside`}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/** The round's problems. During the round they open in the contest; afterwards in practice. */
function ProblemRows({ contest }: { contest: ContestDetail }) {
  if (!contest.problems) return null;
  return (
    <ol className="overflow-hidden rounded-md border border-line">
      {contest.problems.map((problem) => (
        <li key={problem.label} className="border-b border-line last:border-b-0">
          <Link
            to={contest.phase === "RESULTS" ? `/problems/${problem.slug}` : `/contests/${contest.slug}/problems/${problem.label}`}
            className="flex items-center gap-5 px-5 py-4 hover:bg-hover"
          >
            <span className="display w-6 text-2xl text-muted">{problem.label}</span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-md font-semibold">{problem.title}</span>
              <span className="num text-sm text-faint">
                {problem.solvedBy} solved{contest.phase === "LIVE" ? " so far" : ""}
              </span>
            </span>
            <span className="num text-sm text-muted">{problem.points}</span>
            <span className="w-24 text-right text-sm">
              {problem.you === "solved" ? (
                <span className="text-ok">Solved</span>
              ) : problem.you === "attempted" ? (
                <span className="text-slow">Attempted</span>
              ) : (
                <span className="text-faint">Not tried</span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

function Live({ contest }: { contest: ContestDetail }) {
  const guess = contest.you?.guess ?? null;
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Tally tone="onair" />
          <span className="text-base font-semibold text-onair">Live</span>
          <span className="text-base text-muted">ends in</span>
          <Countdown to={new Date(contest.endsAt)} className="text-lg font-semibold" />
        </div>
        {contest.you?.registered ? (
          <span className="inline-flex items-center gap-2 rounded-sm border border-line px-3 py-1.5 text-sm text-muted">
            <Icon name="lock" className="size-3.5 text-signal-fg" />
            {guess ? (
              <>
                Your guess: <span className="num text-fg">top {guess.best}–{guess.worst}%</span>
              </>
            ) : (
              "No guess locked in"
            )}
          </span>
        ) : null}
      </div>

      {contest.problems ? (
        <>
          <ProblemRows contest={contest} />
          {contest.standing ? (
            <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-line bg-line">
              {[
                { label: "Points", value: String(contest.standing.points) },
                { label: "Penalty", value: `${contest.standing.penaltyMinutes} min` },
                { label: "Solved", value: `${contest.standing.solved} / ${contest.problemCount}` },
              ].map((item) => (
                <div key={item.label} className="flex flex-col gap-1 bg-raised p-4">
                  <dt className="label">{item.label}</dt>
                  <dd className="num text-lg">{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </>
      ) : (
        <NotRegistered>
          Only registered contestants can open the problems while the contest is live. They join practice once results are out.
        </NotRegistered>
      )}
    </section>
  );
}

function Judging({ contest }: { contest: ContestDetail }) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">The contest is over. Final standings are being calculated.</h2>
        <p className="text-base text-muted">
          Results go out as soon as the last submission is judged. This page updates by itself.
        </p>
      </div>
      <ProblemRows contest={contest} />
    </section>
  );
}

function Results({ contest }: { contest: ContestDetail }) {
  const guess = contest.you?.guess ?? null;
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Results are out</h2>
        <p className="max-w-[52ch] text-md text-muted">
          {guess ? (
            <>
              You guessed <span className="num text-fg">top {guess.best}–{guess.worst}%</span>. See where you finished and how your ratings changed.
            </>
          ) : (
            "See the final standings, every guess and how ratings changed."
          )}
        </p>
        <div>
          <ButtonLink to={`/contests/${contest.slug}/results`} variant="primary" size="lg">
            {contest.you?.registered ? "See your result" : "See the results"} <Icon name="arrow" />
          </ButtonLink>
        </div>
      </div>
      {contest.problems ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-md font-semibold">The problems, now in practice</h3>
          <ProblemRows contest={contest} />
        </div>
      ) : null}
    </section>
  );
}
