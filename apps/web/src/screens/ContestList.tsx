import type { ContestPhase, ContestSummary } from "@cgl/shared";
import { Link } from "react-router";
import { PageHeader } from "../components/AppShell";
import { Countdown, Tally } from "../components/show";
import { useContests } from "../data/contests";
import { duration, showTime } from "../lib/format";

const PHASE_LABEL: Record<ContestPhase, string> = {
  SCHEDULED: "Registration closes in",
  GUESS_WINDOW: "Starts in",
  LIVE: "Live, ends in",
  JUDGING: "Judging",
  RESULTS: "Results out",
};

const minutes = (c: ContestSummary) => Math.round((new Date(c.endsAt).getTime() - new Date(c.startsAt).getTime()) / 60_000);

function yours(contest: ContestSummary): string {
  if (!contest.you?.registered) return contest.phase === "SCHEDULED" && contest.you ? "Not registered" : "";
  const guess = contest.you.guess;
  return guess ? `Registered · guessed top ${guess.best}–${guess.worst}%` : "Registered";
}

export function ContestList() {
  const contests = useContests();
  const all = contests.data ?? [];
  const current = all.filter((c) => c.phase !== "RESULTS").reverse(); // soonest first
  const past = all.filter((c) => c.phase === "RESULTS");

  return (
    <div className="gutter mx-auto flex max-w-[1240px] flex-col gap-10 py-10">
      <PageHeader title="Contests" />

      <section className="flex flex-col gap-3">
        <h2 className="text-md font-semibold">Coming up</h2>
        {contests.isPending ? <p className="text-base text-muted">Loading…</p> : null}
        {contests.isError ? <p className="text-base text-muted">Couldn't load contests.</p> : null}
        {contests.isSuccess && current.length === 0 ? (
          <p className="text-base text-muted">No round is scheduled right now. The next one will show up here.</p>
        ) : null}
        {current.length ? (
          <ul className="overflow-hidden rounded-md border border-line">
            {current.map((contest) => (
              <li key={contest.slug} className="border-b border-line last:border-b-0">
                <Link to={`/contests/${contest.slug}`} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 hover:bg-hover">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-md font-semibold">{contest.title}</span>
                    <span className="text-sm text-muted">
                      {showTime(new Date(contest.startsAt))} · {duration(minutes(contest))} · {contest.problemCount} problems
                      {contest.isRated ? "" : " · unrated"}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-sm">
                    <Tally tone={contest.phase === "LIVE" ? "onair" : "signal"} />
                    <span className={contest.phase === "LIVE" ? "font-semibold text-onair" : "text-fg"}>{PHASE_LABEL[contest.phase]}</span>
                    {contest.phase === "SCHEDULED" ? (
                      <Countdown to={new Date(contest.guessOpensAt)} className="text-muted" />
                    ) : contest.phase === "GUESS_WINDOW" ? (
                      <Countdown to={new Date(contest.startsAt)} className="text-muted" />
                    ) : contest.phase === "LIVE" ? (
                      <Countdown to={new Date(contest.endsAt)} className="text-muted" />
                    ) : null}
                  </span>
                  <span className="flex w-full flex-col text-sm text-muted sm:w-56 sm:text-right">
                    <span className="num">{contest.registered} registered</span>
                    <span className="text-faint">{yours(contest)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {past.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-md font-semibold">Past rounds</h2>
          <div className="overflow-x-auto rounded-md border border-line">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-raised">
                  <th scope="col" className="label py-2.5 pl-4 font-normal">Round</th>
                  <th scope="col" className="label py-2.5 font-normal">Date</th>
                  <th scope="col" className="label py-2.5 text-right font-normal">Field</th>
                  <th scope="col" className="label py-2.5 pr-4 text-right font-normal">You</th>
                </tr>
              </thead>
              <tbody>
                {past.map((contest) => (
                  <tr key={contest.slug} className="border-b border-line last:border-b-0 hover:bg-hover">
                    <td className="py-3 pr-4 pl-4">
                      <Link to={`/contests/${contest.slug}/results`} className="text-base font-semibold">
                        {contest.title}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-sm text-muted">{new Date(contest.startsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="num py-3 text-right text-sm text-muted">{contest.registered}</td>
                    <td className="py-3 pr-4 text-right text-sm text-muted">
                      {contest.you?.guess ? `guessed top ${contest.you.guess.best}–${contest.you.guess.worst}%` : contest.you?.registered ? "entered" : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
