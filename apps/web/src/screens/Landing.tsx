import type { PercentileGuess } from "@cgl/shared";
import { useState } from "react";
import { Link } from "react-router";
import { ThemeButton } from "../components/AppShell";
import { missBy, predictionScore, RangeRuler, ScoringDetails } from "../components/Range";
import { Countdown, Tally, Wordmark } from "../components/show";
import { Button, ButtonLink, Icon } from "../components/ui";
import { duration, showTime } from "../lib/format";
import { ROUND_12, SAMPLE_CONTESTANT as S } from "../mock/data";

// The order is the point here, so each step carries its time relative to the start
const ROUND_STEPS = [
  { at: "T − 2 days", title: "Register", body: "Registration closes ten minutes before the start." },
  { at: "T − 10:00", title: "Guess your rank", body: "Pick a range such as top 15–30% before any problem is shown." },
  { at: "T + 0:00", title: "Solve", body: "Four problems in 90 minutes, in C++, Python, Java or JavaScript. AI tools are allowed." },
  { at: "T + 1:32", title: "Results", body: "Standings are published with every guess next to its finish. Both ratings update." },
] as const;
const STEP_RULES = ["", "sm:border-l sm:pl-6", "xl:border-l xl:pl-6", "sm:border-l sm:pl-6"];

export function Landing() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="gutter mx-auto flex h-16 w-full max-w-[1240px] items-center justify-between">
        <Wordmark />
        <div className="flex items-center gap-2">
          <ThemeButton />
          <ButtonLink to="/problems" variant="secondary" size="sm">
            Sign in
          </ButtonLink>
        </div>
      </header>

      <main className="flex flex-col gap-16 pt-8 pb-20 md:gap-24 md:pt-14 md:pb-24">
        <section className="gutter mx-auto grid w-full max-w-[1240px] items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
          <div className="flex flex-col gap-6 lg:pt-6">
            <h1 className="display text-3xl md:text-4xl">Guess your rank, then solve.</h1>
            <p className="max-w-[44ch] text-md text-muted">
              Before each round, you predict where you'll finish. Your rating follows how close that prediction was,
              not only how many problems you solved. AI tools are allowed, which makes the prediction the hard part.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <ButtonLink to="/problems" variant="primary" size="lg">
                Continue with Google
              </ButtonLink>
              <a href="#ratings" className="text-base text-muted underline decoration-line-strong underline-offset-4 hover:text-fg">
                How ratings work
              </a>
            </div>
          </div>
          <TryIt />
        </section>

        <NextRound />

        <section className="gutter mx-auto grid w-full max-w-[1240px] gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <h2 className="text-xl font-semibold">How a round works</h2>
          <ol className="grid border-t border-line sm:grid-cols-2 xl:grid-cols-4">
            {ROUND_STEPS.map((step, i) => (
              <li key={step.title} className={`flex flex-col gap-2 border-b border-line py-5 sm:pr-6 ${STEP_RULES[i]}`}>
                <span className="num text-sm text-signal-fg">{step.at}</span>
                <h3 className="text-md font-semibold">{step.title}</h3>
                <p className="text-base text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="ratings" className="gutter mx-auto grid w-full max-w-[1240px] scroll-mt-20 gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">Two ratings</h2>
            <p className="text-base text-muted">Your profile shows both. The leaderboard ranks by Latent.</p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-2">
            <div className="flex flex-col gap-3 bg-raised p-6">
              <h3 className="text-lg font-semibold">Latent</h3>
              <p className="text-base text-muted">
                Measures how well you predict your own finish. Finishing inside a narrow range gains the most. A wide
                range gains little, and each percentage point you finish outside your range adds 10 to your prediction
                score.
              </p>
              <p className="text-base text-muted">If you solve nothing, Latent can't go up, so losing on purpose doesn't help.</p>
            </div>
            <div className="flex flex-col gap-3 bg-raised p-6">
              <h3 className="text-lg font-semibold">Form</h3>
              <p className="text-base text-muted">
                Measures performance: where you placed against everyone else, weighted by their ratings. Both ratings
                move faster in your first five rounds.
              </p>
              <p className="text-base text-muted">A Form well above your Latent means you tend to underestimate yourself.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="gutter mx-auto flex h-14 max-w-[1240px] items-center justify-between text-sm text-faint">
          <span>Code's Got Latent</span>
          <span>Made in India</span>
        </div>
      </footer>
    </div>
  );
}

/** Pick a range, reveal a finish. Scoring opens on request. */
function TryIt() {
  const [guess, setGuess] = useState<PercentileGuess>({ best: 25, worst: 50 });
  const [revealed, setRevealed] = useState(false);
  const score = predictionScore(guess, S.finish);
  const miss = missBy(guess, S.finish);

  return (
    <div className="flex flex-col gap-5 rounded-md border border-line-strong bg-raised p-5 sm:p-7">
      <div className="flex flex-col gap-2">
        <span className="label">Try it</span>
        <p className="text-lg font-medium">
          Say you're one of {S.field} people in a round. You solve {S.solved} of {S.of} problems in {duration(S.minutes)}, with{" "}
          {S.wrong} wrong attempt. Where do you finish?
        </p>
      </div>

      <RangeRuler id="try-it" value={guess} fieldSize={S.field} {...(revealed ? { finish: S.finish } : { onChange: setGuess })} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5" aria-live="polite">
        {revealed ? (
          <>
            <p className="text-md">
              You finish in the <span className="font-semibold">top {S.finish}%</span>,{" "}
              {miss === 0 ? (
                <span className="text-ok">inside your range</span>
              ) : (
                <span className="text-bad">{miss} percentage points outside your range</span>
              )}
              . Prediction score <span className="num">{score}</span>.
            </p>
            <Button variant="secondary" onClick={() => setRevealed(false)}>
              Try another range
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">In a real round, you make this guess before seeing the problems.</p>
            <Button variant="primary" onClick={() => setRevealed(true)}>
              Reveal my finish
            </Button>
          </>
        )}
      </div>

      <ScoringDetails guess={guess} finish={revealed ? S.finish : undefined} />
    </div>
  );
}

/** A show moment: the next round, on the stage colour. */
function NextRound() {
  return (
    <section className="bg-stage text-stage-fg">
      <div className="gutter mx-auto flex max-w-[1240px] flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Tally tone="signal" />
          <div className="flex flex-col">
            <span className="text-sm text-stage-muted">Next round</span>
            <span className="display text-2xl">
              {ROUND_12.title} · {showTime(ROUND_12.startsAt)}
            </span>
          </div>
        </div>
        <dl className="flex flex-wrap gap-x-10 gap-y-3">
          <div className="flex flex-col">
            <dt className="text-sm text-stage-muted">Starts in</dt>
            <dd>
              <Countdown to={ROUND_12.startsAt} className="text-lg" />
            </dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-sm text-stage-muted">Registered</dt>
            <dd className="num text-lg">{ROUND_12.registered}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-sm text-stage-muted">Format</dt>
            <dd className="text-lg">
              {ROUND_12.problems.length} problems · {ROUND_12.durationMinutes} min
            </dd>
          </div>
        </dl>
        <Link
          to={`/contests/${ROUND_12.slug}`}
          className="inline-flex h-11 items-center gap-2 self-start rounded-sm bg-stage-accent px-4 text-base font-semibold text-on-signal md:self-auto"
        >
          Register <Icon name="arrow" />
        </Link>
      </div>
    </section>
  );
}
