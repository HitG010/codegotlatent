import { useState } from "react";
import { Link } from "react-router";
import { Avatar } from "../components/AppShell";
import { RangeTimeline, Sparkline } from "../components/charts";
import { missBy, predictionScore, RangeMark, RangeRuler } from "../components/Range";
import { Meter, VerdictChip } from "../components/ui";
import { signed } from "../lib/format";
import { HISTORY, isHit, ME, PRACTICE, PRACTICE_TOTALS, RECENT_SUBMISSIONS, type Difficulty } from "../mock/data";

const LEVELS: { level: Difficulty; label: string }[] = [
  { level: "EASY", label: "Easy" },
  { level: "MEDIUM", label: "Medium" },
  { level: "HARD", label: "Hard" },
];

/** Which way your guesses lean, in words that can't be read backwards. */
function biasSentence(): string {
  // Positive: on average you finished further down than the middle of your guess
  const lean = HISTORY.reduce((sum, r) => sum + r.finish - (r.guess.best + r.guess.worst) / 2, 0) / HISTORY.length;
  const points = Math.round(Math.abs(lean));
  if (points < 2) return "Your guesses are centred on where you actually finish.";
  return lean > 0
    ? `On average you expected to finish about ${points} percentage points better than you did.`
    : `On average you finished about ${points} percentage points better than you expected.`;
}

export function Profile() {
  const last = HISTORY[HISTORY.length - 1]!;
  const [round, setRound] = useState(last.round);
  const selected = HISTORY.find((r) => r.round === round)!;
  const hits = HISTORY.filter(isHit).length;
  const meanWidth = Math.round(HISTORY.reduce((sum, r) => sum + r.guess.worst - r.guess.best, 0) / HISTORY.length);
  const miss = missBy(selected.guess, selected.finish);

  return (
    <div className="gutter mx-auto flex max-w-[1240px] flex-col gap-12 py-10">
      <header className="flex flex-wrap items-center gap-5">
        <Avatar name={ME.name} size="lg" />
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">{ME.handle}</h1>
          <p className="text-base text-muted">
            {ME.name} · {ME.location} · playing since {ME.joined}
          </p>
        </div>
      </header>

      {/* Calibration leads: it's what this profile is about */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Guesses and finishes</h2>
          <p className="text-md text-muted">
            Inside the range in <span className="text-fg">{hits} of {HISTORY.length}</span> rounds · average range{" "}
            <span className="text-fg">{meanWidth} percentage points</span> wide. {biasSentence()}
          </p>
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <RangeTimeline records={HISTORY} selected={round} onSelect={setRound} />
          <aside className="flex flex-col gap-5 rounded-md border border-line bg-raised p-5" aria-live="polite">
            <div className="flex items-baseline justify-between">
              <h3 className="display text-2xl">Round {selected.round}</h3>
              <span className="text-sm text-muted">{selected.field} players</span>
            </div>
            <RangeRuler id="profile-round" value={selected.guess} fieldSize={selected.field} finish={selected.finish} />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted">Guessed</dt>
              <dd className="text-right">
                top {selected.guess.best}–{selected.guess.worst}%
              </dd>
              <dt className="text-muted">Finished</dt>
              <dd className="text-right">
                top {selected.finish}% <span className={miss === 0 ? "text-ok" : "text-bad"}>{miss === 0 ? "· inside" : `· ${miss} pts outside`}</span>
              </dd>
              <dt className="text-muted">Prediction score</dt>
              <dd className="num text-right">{predictionScore(selected.guess, selected.finish)}</dd>
              <dt className="text-muted">Latent change</dt>
              <dd className={`num text-right ${selected.latentDelta >= 0 ? "text-ok" : "text-bad"}`}>{signed(selected.latentDelta)}</dd>
              <dt className="text-muted">Form change</dt>
              <dd className={`num text-right ${selected.formDelta >= 0 ? "text-ok" : "text-bad"}`}>{signed(selected.formDelta)}</dd>
            </dl>
          </aside>
        </div>
      </section>

      <section className="grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-2">
        <RatingBlock name="Latent" note="How well you predict your finish" value={last.latentAfter} delta={last.latentDelta} series={HISTORY.map((r) => r.latentAfter)} />
        <RatingBlock name="Form" note="How you perform" value={last.formAfter} delta={last.formDelta} series={HISTORY.map((r) => r.formAfter)} />
      </section>

      <section className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <h2 className="text-lg font-semibold">Contests</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th scope="col" className="label py-2">Round</th>
                  <th scope="col" className="label py-2">Guess and finish</th>
                  <th scope="col" className="label py-2 text-right">Latent</th>
                  <th scope="col" className="label py-2 text-right">Form</th>
                </tr>
              </thead>
              <tbody>
                {[...HISTORY].reverse().map((r) => (
                  <tr key={r.round} className="border-b border-line">
                    <td className="py-3 pr-4">
                      {r.round === 12 ? (
                        <Link to="/contests/round-12/results" className="underline decoration-line-strong underline-offset-4 hover:text-signal-fg">
                          Round {r.round}
                        </Link>
                      ) : (
                        `Round ${r.round}`
                      )}
                    </td>
                    <td className="py-3 pr-6">
                      <RangeMark guess={r.guess} finish={r.finish} you className="w-44" />
                      <span className="num mt-1 block text-2xs text-faint">
                        {r.guess.best}–{r.guess.worst} · {r.finish}
                      </span>
                    </td>
                    <td className={`num py-3 text-right ${r.latentDelta >= 0 ? "text-ok" : "text-bad"}`}>{signed(r.latentDelta)}</td>
                    <td className={`num py-3 text-right ${r.formDelta >= 0 ? "text-ok" : "text-bad"}`}>{signed(r.formDelta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-10">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">
              Practice · {PRACTICE.filter((p) => p.status === "solved").length} solved
            </h2>
            <dl className="flex flex-col gap-4">
              {LEVELS.map(({ level, label }) => {
                const solved = PRACTICE.filter((p) => p.difficulty === level && p.status === "solved").length;
                return (
                  <div key={level} className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between text-sm">
                      <dt>{label}</dt>
                      <dd className="num text-muted">
                        {solved}/{PRACTICE_TOTALS[level]}
                      </dd>
                    </div>
                    <Meter value={solved} total={PRACTICE_TOTALS[level]} />
                  </div>
                );
              })}
            </dl>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Recent submissions</h2>
            <ul className="flex flex-col">
              {RECENT_SUBMISSIONS.map((s) => (
                <li key={s.id} className="flex items-center gap-3 border-b border-line py-2.5 text-sm">
                  <VerdictChip verdict={s.verdict} />
                  <Link to={`/problems/${s.problemSlug}`} className="min-w-0 flex-1 truncate font-medium hover:text-signal-fg">
                    {s.problem}
                  </Link>
                  <span className="text-muted">{s.language}</span>
                  <span className="w-20 text-right text-faint">{s.ago}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function RatingBlock({ name, note, value, delta, series }: { name: string; note: string; value: number; delta: number; series: number[] }) {
  return (
    <div className="flex items-end justify-between gap-4 bg-raised p-5">
      <div className="flex flex-col gap-1">
        <span className="label">
          {name} rating · <span className="font-normal">{note}</span>
        </span>
        <span className="flex items-baseline gap-2.5">
          <span className="display text-2xl">{value}</span>
          <span className={`num text-md font-semibold ${delta >= 0 ? "text-ok" : "text-bad"}`}>{signed(delta)}</span>
        </span>
      </div>
      <Sparkline values={series} label={`${name} over the last ${series.length} contests, from ${series[0]} to ${series[series.length - 1]}`} />
    </div>
  );
}
