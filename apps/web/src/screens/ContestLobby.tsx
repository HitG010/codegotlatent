import type { ContestPhase, PercentileGuess } from "@cgl/shared";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { missBy, RangeMark, RangeRuler, ScoringDetails } from "../components/Range";
import { Countdown, PhaseBar, Tally } from "../components/show";
import { Button, ButtonLink, Icon, Segmented } from "../components/ui";
import { showTime } from "../lib/format";
import { HISTORY, ROUND_12 } from "../mock/data";

const PHASE_OPTIONS = [
  { value: "SCHEDULED", label: "Registration" },
  { value: "GUESS_WINDOW", label: "Guess window" },
  { value: "LIVE", label: "Live" },
  { value: "JUDGING", label: "Judging" },
  { value: "RESULTS", label: "Results" },
] as const satisfies readonly { value: ContestPhase; label: string }[];

const MARKS: Record<ContestPhase, string> = {
  SCHEDULED: "Open now",
  GUESS_WINDOW: "T − 10:00",
  LIVE: "T + 0:00",
  JUDGING: "T + 1:30",
  RESULTS: "T + 1:32",
};

export function ContestLobby() {
  const [phase, setPhase] = useState<ContestPhase>("GUESS_WINDOW");
  // Preview clocks, so every phase has a live countdown
  const clocks = useMemo(() => {
    const now = Date.now();
    return { locksAt: new Date(now + 7 * 60_000 + 42_000), endsAt: new Date(now + 72 * 60_000 + 33_000) };
  }, []);

  return (
    <div className="gutter mx-auto flex max-w-[1240px] flex-col gap-8 py-10">
      <div className="flex flex-col gap-3 rounded-md border border-dashed border-line-strong p-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-muted">
          <span className="label mr-2">Prototype</span>Preview this page in each phase of the round.
        </span>
        <div className="overflow-x-auto">
          <Segmented label="Preview phase" options={PHASE_OPTIONS} value={phase} onChange={setPhase} />
        </div>
      </div>

      {/* The contest's title card, on the stage colour */}
      <header className="flex flex-col overflow-hidden rounded-md bg-stage text-stage-fg">
        <div className="flex flex-wrap items-end justify-between gap-6 p-6 sm:p-8">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-stage-muted">Rated contest</span>
            <h1 className="display text-4xl">{ROUND_12.title}</h1>
          </div>
          <dl className="flex flex-wrap gap-x-8 gap-y-2">
            {[
              { label: "Starts", value: showTime(ROUND_12.startsAt) },
              { label: "Length", value: `${ROUND_12.durationMinutes} min` },
              { label: "Problems", value: String(ROUND_12.problems.length) },
              { label: "Registered", value: String(ROUND_12.registered) },
            ].map((item) => (
              <div key={item.label} className="flex flex-col">
                <dt className="text-sm text-stage-muted">{item.label}</dt>
                <dd className="text-md font-medium">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <PhaseBar phase={phase} marks={MARKS} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {phase === "SCHEDULED" ? <Registration /> : null}
          {phase === "GUESS_WINDOW" ? <GuessWindow locksAt={clocks.locksAt} /> : null}
          {phase === "LIVE" ? <Live endsAt={clocks.endsAt} /> : null}
          {phase === "JUDGING" ? <Judging /> : null}
          {phase === "RESULTS" ? <Results /> : null}
        </div>
        <aside className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold">How your guess is scored</h2>
            <p className="text-base text-muted">
              If you finish inside your range, your score is its width. Each percentile you finish outside adds 10.
              Lower is better. Latent compares your score with everyone else's.
            </p>
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold">Rules</h2>
            <ul className="flex flex-col gap-2 text-base text-muted">
              <li>AI tools are allowed.</li>
              <li>
                Wrong attempts before an accept cost <span className="num text-fg">{ROUND_12.penaltyMinutes}</span> minutes each.
              </li>
              <li>Standings are hidden until results are published.</li>
              <li>Ties share a rank.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Registration() {
  const [registered, setRegistered] = useState(false);
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="label">Guess window opens in</span>
        <Countdown to={ROUND_12.guessOpensAt} className="text-3xl font-semibold tracking-tight" />
      </div>
      <p className="max-w-[56ch] text-md text-muted">
        Ten minutes before the start you'll call your range, before you've seen a single problem. Registration closes
        when that window opens.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {registered ? (
          <>
            <span className="inline-flex h-11 items-center gap-2 text-md font-semibold text-ok">
              <Icon name="check" /> You're registered
            </span>
            <Button variant="ghost" onClick={() => setRegistered(false)}>
              Unregister
            </Button>
          </>
        ) : (
          <Button variant="primary" size="lg" onClick={() => setRegistered(true)}>
            Register for {ROUND_12.title}
          </Button>
        )}
      </div>
    </section>
  );
}

function GuessWindow({ locksAt }: { locksAt: Date }) {
  const [guess, setGuess] = useState<PercentileGuess>({ best: 15, worst: 30 });
  const [locked, setLocked] = useState(false);
  const recent = HISTORY.slice(-4, -1).reverse();

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-xl font-semibold">Guess your rank</h2>
          <p className="text-base text-muted">
            Where will you finish among <span className="num text-fg">{ROUND_12.registered}</span> people? Pick a range you're about 80% sure of.
          </p>
        </div>
        <div className="flex items-center gap-2.5 rounded-sm border border-line px-3 py-2">
          <Tally tone="signal" />
          <span className="text-sm text-muted">Locks in</span>
          <Countdown to={locksAt} className="text-md font-semibold" />
        </div>
      </div>

      <div className={`rounded-md border p-5 sm:p-6 ${locked ? "border-line" : "border-line-strong bg-raised"}`}>
        <RangeRuler id="round-12-guess" value={guess} fieldSize={ROUND_12.registered} {...(locked ? {} : { onChange: setGuess })} />
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          {locked ? (
            <>
              <span className="inline-flex items-center gap-2 text-base">
                <Icon name="lock" className="size-4 text-signal-fg" />
                Locked in at <span className="font-semibold">top {guess.best}–{guess.worst}%</span>. You can change it until the window closes.
              </span>
              <Button variant="secondary" onClick={() => setLocked(false)}>
                Change
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm text-muted">If you submit without a guess, you lose 15 Latent.</span>
              <Button variant="primary" size="lg" onClick={() => setLocked(true)}>
                <Icon name="lock" /> Lock it in
              </Button>
            </>
          )}
        </div>
      </div>

      <ScoringDetails guess={guess} />

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
    </section>
  );
}

function Live({ endsAt }: { endsAt: Date }) {
  const statuses = ["solved", "solved", "attempted", null] as const;
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Tally tone="onair" />
          <span className="text-base font-semibold text-onair">Live</span>
          <span className="text-base text-muted">ends in</span>
          <Countdown to={endsAt} className="text-lg font-semibold" />
        </div>
        <span className="inline-flex items-center gap-2 rounded-sm border border-line px-3 py-1.5 text-sm text-muted">
          <Icon name="lock" className="size-3.5 text-signal-fg" /> Your guess: <span className="num text-fg">top 15–30%</span>
        </span>
      </div>

      <ol className="overflow-hidden rounded-md border border-line">
        {ROUND_12.problems.map((problem, i) => {
          const status = statuses[i];
          return (
            <li key={problem.label} className="border-b border-line last:border-b-0">
              <Link to={`/problems/${problem.slug}`} className="flex items-center gap-5 px-5 py-4 hover:bg-hover">
                <span className="display w-6 text-2xl text-muted">{problem.label}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-md font-semibold">{problem.title}</span>
                  <span className="num text-sm text-faint">{problem.solvedBy} solved so far</span>
                </span>
                <span className="num text-sm text-muted">{problem.points}</span>
                <span className="w-24 text-right text-sm">
                  {status === "solved" ? <span className="text-ok">Solved</span> : status === "attempted" ? <span className="text-slow">2 wrong</span> : <span className="text-faint">Not tried</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-line bg-line">
        {[
          { label: "Points", value: "1500" },
          { label: "Penalty", value: "41 min" },
          { label: "Solved", value: "2 / 4" },
        ].map((item) => (
          <div key={item.label} className="flex flex-col gap-1 bg-raised p-4">
            <dt className="label">{item.label}</dt>
            <dd className="num text-lg">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Judging() {
  const steps = [
    { label: "Final submissions re-judged", done: true },
    { label: "Standings computed", done: false },
    { label: "Guesses scored, ratings updated", done: false },
  ];
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">The contest is over. Final standings are being calculated.</h2>
      <ol className="flex flex-col">
        {steps.map((step, i) => (
          <li key={step.label} className="flex items-center gap-3 border-b border-line py-3 text-base">
            {step.done ? (
              <Icon name="check" className="size-4 text-ok" />
            ) : i === 1 ? (
              <span className="tally size-2 rounded-full bg-signal" />
            ) : (
              <span className="size-2 rounded-full bg-line-strong" />
            )}
            <span className={step.done ? "text-muted" : i === 1 ? "text-fg" : "text-faint"}>{step.label}</span>
          </li>
        ))}
      </ol>
      <p className="text-base text-muted">Results are usually out within two minutes.</p>
    </section>
  );
}

function Results() {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Results are out</h2>
      <p className="max-w-[52ch] text-md text-muted">
        You guessed <span className="num text-fg">top 15–30%</span>. See where you finished and how your ratings changed.
      </p>
      <div>
        <ButtonLink to={`/contests/${ROUND_12.slug}/results`} variant="primary" size="lg">
          See your result <Icon name="arrow" />
        </ButtonLink>
      </div>
    </section>
  );
}
