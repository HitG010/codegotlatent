import { LANGUAGES, type ProfileContest, type UserProfile } from "@cgl/shared";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { Avatar } from "../components/AppShell";
import { isHit, RangeTimeline, Sparkline, type TimelineRecord } from "../components/charts";
import { missBy, predictionScore, RangeMark, RangeRuler } from "../components/Range";
import { Meter, VerdictChip } from "../components/ui";
import { useProfile } from "../data/profile";
import { ApiError } from "../lib/api";
import { signed } from "../lib/format";

const LEVELS = [
  { level: "EASY", label: "Easy" },
  { level: "MEDIUM", label: "Medium" },
  { level: "HARD", label: "Hard" },
] as const;

type Guessed = ProfileContest & { guess: NonNullable<ProfileContest["guess"]> };

const pct = (n: number) => Math.round(n);
const tidy = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const deltaClass = (d: number) => (d > 0 ? "text-ok" : d < 0 ? "text-bad" : "text-muted");

/** "R12" for "Round 12"; otherwise the round's position in the list. */
const shortLabel = (title: string, i: number) => {
  const number = /(\d+)\s*$/.exec(title)?.[1];
  return number ? `R${number}` : `#${i + 1}`;
};

/** Which way your guesses lean, in words that can't be read backwards. */
function biasSentence(rounds: Guessed[]): string {
  // Positive: on average you finished further down than the middle of your guess
  const lean = rounds.reduce((sum, r) => sum + r.finish - (r.guess.best + r.guess.worst) / 2, 0) / rounds.length;
  const points = Math.round(Math.abs(lean));
  if (points < 2) return "The guesses are centred on where the finishes land.";
  return lean > 0
    ? `On average the finish was about ${points} percentage points lower than the middle of the guess.`
    : `On average the finish was about ${points} percentage points better than the middle of the guess.`;
}

export function Profile() {
  const { handle = "" } = useParams();
  const profile = useProfile(handle);

  if (profile.isPending) return <div className="gutter mx-auto max-w-[1240px] py-10 text-base text-muted">Loading profile…</div>;
  if (profile.isError) {
    const missing = profile.error instanceof ApiError && profile.error.status === 404;
    return (
      <div className="gutter mx-auto flex max-w-[1240px] flex-col gap-3 py-10 text-base text-muted">
        {missing ? `There's no player called ${handle}.` : "Couldn't load this profile."}
        <Link to="/problems" className="text-fg underline underline-offset-4">
          Back to problems
        </Link>
      </div>
    );
  }
  return <ProfileView profile={profile.data} />;
}

function ProfileView({ profile }: { profile: UserProfile }) {
  const joined = new Date(profile.joinedAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  const rated = profile.contests.filter((c) => c.latent !== null);

  return (
    <div className="gutter mx-auto flex max-w-[1240px] flex-col gap-12 py-10">
      <header className="flex flex-wrap items-center gap-5">
        <Avatar name={profile.handle} size="lg" />
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">{profile.handle}</h1>
          <p className="text-base text-muted">
            Playing since {joined} · {profile.contests.length} {profile.contests.length === 1 ? "round" : "rounds"}
          </p>
        </div>
      </header>

      <Calibration profile={profile} />

      <section className="grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-2">
        <RatingBlock
          name="Latent"
          note="How well you predict your finish"
          value={profile.latent.rating}
          series={rated.length ? [rated[0]!.latent!.before, ...rated.map((c) => c.latent!.after)] : []}
          delta={rated.at(-1)?.latent?.delta}
        />
        <RatingBlock
          name="Form"
          note="How you perform"
          value={profile.form.rating}
          series={rated.length ? [rated[0]!.form!.before, ...rated.map((c) => c.form!.after)] : []}
          delta={rated.at(-1)?.form?.delta}
        />
      </section>

      <section className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <ContestTable contests={profile.contests} />
        <div className="flex min-w-0 flex-col gap-10">
          <Practice profile={profile} />
          {profile.recentSubmissions ? <RecentSubmissions submissions={profile.recentSubmissions} /> : null}
        </div>
      </section>
    </div>
  );
}

/** Calibration leads: it's what this profile is about. */
function Calibration({ profile }: { profile: UserProfile }) {
  const rounds = useMemo(() => profile.contests.filter((c): c is Guessed => c.guess !== null), [profile.contests]);
  const records = useMemo<TimelineRecord[]>(
    () => rounds.map((r, i) => ({ id: r.slug, label: shortLabel(r.title, i), name: r.title, guess: r.guess, finish: r.finish })),
    [rounds],
  );
  const [chosen, setChosen] = useState<string | null>(null);
  const selected = rounds.find((r) => r.slug === chosen) ?? rounds.at(-1);

  if (!selected) {
    return (
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Guesses and finishes</h2>
        <p className="max-w-[60ch] text-md text-muted">
          {profile.you
            ? "Once you've guessed your rank in a round and its results are out, your guesses and finishes show up here."
            : "No guessed rounds yet."}{" "}
          {profile.you ? (
            <Link to="/contests" className="text-fg underline underline-offset-4">
              See the contests
            </Link>
          ) : null}
        </p>
      </section>
    );
  }

  const hits = rounds.filter(isHit).length;
  const meanWidth = Math.round(rounds.reduce((sum, r) => sum + r.guess.worst - r.guess.best, 0) / rounds.length);
  const miss = missBy(selected.guess, selected.finish);
  const score = selected.predictionScore ?? predictionScore(selected.guess, selected.finish);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Guesses and finishes</h2>
        <p className="text-md text-muted">
          Inside the range in{" "}
          <span className="text-fg">
            {hits} of {rounds.length}
          </span>{" "}
          {rounds.length === 1 ? "round" : "rounds"} · average range <span className="text-fg">{meanWidth} percentage points</span> wide.{" "}
          {biasSentence(rounds)}
        </p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <RangeTimeline records={records} selected={selected.slug} onSelect={setChosen} />
        <aside className="flex flex-col gap-5 rounded-md border border-line bg-raised p-5" aria-live="polite">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="display truncate text-2xl">{selected.title}</h3>
            <span className="shrink-0 text-sm text-muted">
              {selected.field} {selected.field === 1 ? "player" : "players"}
            </span>
          </div>
          <RangeRuler id="profile-round" value={selected.guess} fieldSize={selected.field} finish={selected.finish} />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <dt className="text-muted">Guessed</dt>
            <dd className="text-right">
              top {selected.guess.best}–{selected.guess.worst}%
            </dd>
            <dt className="text-muted">Finished</dt>
            <dd className="text-right">
              top {pct(selected.finish)}%{" "}
              <span className={miss === 0 ? "text-ok" : "text-bad"}>{miss === 0 ? "· inside" : `· ${tidy(miss)} pts outside`}</span>
            </dd>
            <dt className="text-muted">Prediction score</dt>
            <dd className="num text-right">{tidy(score)}</dd>
            <dt className="text-muted">Latent change</dt>
            <dd className={`num text-right ${selected.latent ? deltaClass(selected.latent.delta) : "text-muted"}`}>
              {selected.latent ? signed(selected.latent.delta) : "unrated"}
            </dd>
            <dt className="text-muted">Form change</dt>
            <dd className={`num text-right ${selected.form ? deltaClass(selected.form.delta) : "text-muted"}`}>
              {selected.form ? signed(selected.form.delta) : "unrated"}
            </dd>
          </dl>
          <Link to={`/contests/${selected.slug}/results`} className="text-sm text-muted underline decoration-line-strong underline-offset-4 hover:text-fg">
            Full results
          </Link>
        </aside>
      </div>
    </section>
  );
}

function RatingBlock({ name, note, value, delta, series }: { name: string; note: string; value: number; delta: number | undefined; series: number[] }) {
  return (
    <div className="flex items-end justify-between gap-4 bg-raised p-5">
      <div className="flex flex-col gap-1">
        <span className="label">
          {name} rating · <span className="font-normal">{note}</span>
        </span>
        <span className="flex items-baseline gap-2.5">
          <span className="display text-2xl">{value}</span>
          {delta === undefined ? (
            <span className="text-sm text-muted">No rated rounds yet</span>
          ) : (
            <span className={`num text-md font-semibold ${deltaClass(delta)}`}>{signed(delta)}</span>
          )}
        </span>
      </div>
      {series.length >= 2 ? (
        <Sparkline values={series} label={`${name} over the last ${series.length - 1} rated rounds, from ${series[0]} to ${series.at(-1)}`} />
      ) : null}
    </div>
  );
}

function ContestTable({ contests }: { contests: ProfileContest[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h2 className="text-lg font-semibold">Contests</h2>
      {contests.length === 0 ? (
        <p className="text-base text-muted">No finished rounds yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th scope="col" className="label py-2">Round</th>
                <th scope="col" className="label py-2 text-right">Rank</th>
                <th scope="col" className="label py-2 pl-6">Guess and finish</th>
                <th scope="col" className="label py-2 text-right">Latent</th>
                <th scope="col" className="label py-2 text-right">Form</th>
              </tr>
            </thead>
            <tbody>
              {[...contests].reverse().map((c) => (
                <tr key={c.slug} className="border-b border-line">
                  <td className="py-3 pr-4">
                    <Link to={`/contests/${c.slug}/results`} className="underline decoration-line-strong underline-offset-4 hover:text-signal-fg">
                      {c.title}
                    </Link>
                  </td>
                  <td className="num py-3 text-right text-muted">
                    {c.rank}
                    <span className="text-faint">/{c.field}</span>
                  </td>
                  <td className="py-3 pr-6 pl-6">
                    {c.guess ? (
                      <>
                        <RangeMark guess={c.guess} finish={c.finish} you className="w-44" />
                        <span className="num mt-1 block text-2xs text-faint">
                          {c.guess.best}–{c.guess.worst} · {pct(c.finish)}
                        </span>
                      </>
                    ) : (
                      <span className="text-faint">No guess · finished top {pct(c.finish)}%</span>
                    )}
                  </td>
                  <td className={`num py-3 text-right ${c.latent ? deltaClass(c.latent.delta) : "text-faint"}`}>{c.latent ? signed(c.latent.delta) : "–"}</td>
                  <td className={`num py-3 text-right ${c.form ? deltaClass(c.form.delta) : "text-faint"}`}>{c.form ? signed(c.form.delta) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Practice({ profile }: { profile: UserProfile }) {
  const solved = LEVELS.reduce((sum, { level }) => sum + profile.practice[level].solved, 0);
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Practice · {solved} solved</h2>
      <dl className="flex flex-col gap-4">
        {LEVELS.map(({ level, label }) => {
          const { solved: done, total } = profile.practice[level];
          return (
            <div key={level} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between text-sm">
                <dt>{label}</dt>
                <dd className="num text-muted">
                  {done}/{total}
                </dd>
              </div>
              <Meter value={done} total={total} />
            </div>
          );
        })}
      </dl>
    </div>
  );
}

const ago = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

function RecentSubmissions({ submissions }: { submissions: NonNullable<UserProfile["recentSubmissions"]> }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">
        Recent submissions <span className="text-sm font-normal text-faint">· only you can see these</span>
      </h2>
      {submissions.length === 0 ? (
        <p className="text-base text-muted">Nothing yet.</p>
      ) : (
        <ul className="flex flex-col">
          {submissions.map((s) => (
            <li key={s.id} className="flex items-center gap-3 border-b border-line py-2.5 text-sm">
              {s.verdict ? <VerdictChip verdict={s.verdict} /> : <span className="w-9 text-center text-faint">…</span>}
              <Link to={`/problems/${s.problemSlug}`} className="min-w-0 flex-1 truncate font-medium hover:text-signal-fg">
                {s.problemTitle}
              </Link>
              <span className="text-muted">{LANGUAGES[s.language].label}</span>
              <span className="w-20 text-right text-faint">{ago(s.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
