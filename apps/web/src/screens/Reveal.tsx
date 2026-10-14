import type { ContestResultCell, ContestResultRow, ContestResults } from "@cgl/shared";
import { useMemo, useRef, useState, type RefObject } from "react";
import { Link, useParams } from "react-router";
import { CountUp } from "../components/charts";
import { missBy, MISS_COST, predictionScore, RangeMark, RangeRuler } from "../components/Range";
import { Wordmark } from "../components/show";
import { Button, Icon } from "../components/ui";
import { useContestResults } from "../data/contests";
import { ApiError } from "../lib/api";
import { useUser } from "../lib/auth";
import { signed } from "../lib/format";

type You = NonNullable<ContestResults["you"]>;

const pct = (n: number) => Math.round(n);
const tidy = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function Reveal() {
  const { slug = "" } = useParams();
  const results = useContestResults(slug);

  if (results.isPending) return <div className="gutter mx-auto max-w-[1240px] py-10 text-base text-muted">Loading results…</div>;
  if (results.isError) {
    const error = results.error instanceof ApiError ? results.error : null;
    return (
      <div className="gutter mx-auto flex max-w-[1240px] flex-col gap-3 py-10 text-base text-muted">
        {error?.status === 409 ? "Results aren't out yet." : error?.status === 404 ? "There's no contest here." : "Couldn't load the results."}
        <Link to={`/contests/${slug}`} className="text-fg underline underline-offset-4">
          Back to the contest
        </Link>
      </div>
    );
  }

  const { contest, you, rows } = results.data;
  return (
    <div className="gutter mx-auto flex max-w-[1240px] flex-col gap-10 py-10">
      {you ? (
        <YourResult results={results.data} you={you} />
      ) : (
        <section className="flex flex-col gap-2 rounded-md bg-stage p-6 text-stage-fg sm:p-8">
          <span className="text-sm text-stage-muted">Results</span>
          <h1 className="display text-3xl sm:text-4xl">{contest.title}</h1>
          <p className="text-md text-stage-muted">
            <span className="num text-stage-fg">{contest.field}</span> contestants
            {rows[0] ? (
              <>
                . Won by <span className="text-stage-fg">{rows[0].handle}</span>
                {rows[0].guess ? `, who guessed top ${rows[0].guess.best}–${rows[0].guess.worst}%` : ""}.
              </>
            ) : (
              "."
            )}
          </p>
        </section>
      )}

      <Standings results={results.data} />
    </div>
  );
}

function YourResult({ results, you }: { results: ContestResults; you: You }) {
  const [run, setRun] = useState(0);
  const share = useRef<HTMLDialogElement>(null);
  const { contest } = results;
  const finish = pct(you.finish);
  const guess = you.guess;
  const miss = guess ? missBy(guess, you.finish) : 0;
  const score = guess ? (you.predictionScore ?? predictionScore(guess, you.finish)) : null;

  return (
    <>
      {/* The show moment: one statement, one comparison */}
      <section className="grid gap-8 rounded-md bg-stage p-6 text-stage-fg sm:p-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-12">
        <div className="flex flex-col gap-4">
          <span className="text-sm text-stage-muted">{contest.title} results</span>
          <h1 className="display text-3xl sm:text-4xl">
            You finished top <CountUp key={run} from={50} to={finish} run={run} />%
          </h1>
          <p className="text-md text-stage-muted">
            {guess ? (
              <>
                You guessed top {guess.best}–{guess.worst}%,{" "}
                {miss === 0 ? "so you finished inside your range." : `so you finished ${tidy(miss)} percentage points outside it.`}
              </>
            ) : (
              "You didn't lock in a guess this time."
            )}{" "}
            Rank <span className="num text-stage-fg">{you.rank}</span> of <span className="num text-stage-fg">{contest.field}</span>.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {guess ? (
              <button
                type="button"
                onClick={() => share.current?.showModal()}
                className="inline-flex h-10 items-center gap-2 rounded-sm bg-stage-accent px-4 text-base font-semibold text-on-signal"
              >
                Share result
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setRun((r) => r + 1)}
              className="inline-flex h-10 items-center rounded-sm px-3 text-base font-medium text-stage-muted hover:bg-stage-raised hover:text-stage-fg"
            >
              Replay
            </button>
          </div>
        </div>
        {guess ? <RangeRuler key={run} id="result-range" value={guess} fieldSize={contest.field} finish={you.finish} tone="stage" /> : null}
      </section>

      {/* Each number appears once */}
      <dl className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Prediction score"
          value={score === null ? "–" : tidy(score)}
          note={
            guess
              ? `${guess.worst - guess.best} for the range's width + ${tidy(miss * MISS_COST)} for finishing outside it. Lower is better.`
              : "No guess, so a fixed Latent penalty instead."
          }
        />
        <RatingStat label="Latent rating" change={you.latent} rated={contest.isRated} />
        <RatingStat label="Form rating" change={you.form} rated={contest.isRated} />
        <Stat
          label="Contest points"
          value={String(you.points)}
          note={`${you.solved} of ${contest.problems.length} solved · ${you.penaltyMinutes} penalty minutes`}
        />
      </dl>

      {guess ? <ShareDialog dialog={share} title={contest.title} guess={guess} finish={finish} /> : null}
    </>
  );
}

function RatingStat({ label, change, rated }: { label: string; change: You["latent"]; rated: boolean }) {
  if (!change) return <Stat label={label} value="–" note={rated ? "Unchanged" : "Unrated contest"} />;
  return <Stat label={label} value={String(change.after)} delta={change.delta} note={`Was ${change.before}`} />;
}

function Stat({ label, value, delta, note }: { label: string; value: string; delta?: number; note: string }) {
  return (
    <div className="flex flex-col gap-1.5 bg-raised p-5">
      <dt className="label">{label}</dt>
      <dd className="flex items-baseline gap-2.5">
        <span className="display text-2xl">{value}</span>
        {delta === undefined ? null : (
          <span className={`num text-md font-semibold ${delta > 0 ? "text-ok" : delta < 0 ? "text-bad" : "text-muted"}`}>{signed(delta)}</span>
        )}
      </dd>
      <dd className="text-sm text-muted">{note}</dd>
    </div>
  );
}

/** The image people post, opened on request instead of crowding the page. */
function ShareDialog({
  dialog,
  title,
  guess,
  finish,
}: {
  dialog: RefObject<HTMLDialogElement | null>;
  title: string;
  guess: NonNullable<You["guess"]>;
  finish: number;
}) {
  const [copied, setCopied] = useState(false);
  const handle = useUser()?.handle ?? "";
  const text = `I guessed top ${guess.best}–${guess.worst}% in ${title} of Code's Got Latent and finished top ${finish}%.`;
  return (
    <dialog
      ref={dialog}
      aria-labelledby="share-title"
      className="m-auto w-[min(560px,calc(100vw-32px))] rounded-md border border-line-strong bg-raised p-0 text-fg shadow-pop backdrop:bg-[rgb(0_0_0/0.6)]"
      onClick={(event) => {
        if (event.target === event.currentTarget) dialog.current?.close();
      }}
    >
      <div className="flex flex-col gap-5 p-5">
        <div className="flex items-center justify-between">
          <h2 id="share-title" className="text-lg font-semibold">
            Share your result
          </h2>
          <button type="button" onClick={() => dialog.current?.close()} className="rounded-sm px-2 py-1 text-sm text-muted hover:bg-hover hover:text-fg">
            Close
          </button>
        </div>
        <figure className="flex aspect-[1200/630] flex-col justify-between rounded-md bg-stage p-[5%] text-stage-fg">
          <div className="flex items-center justify-between">
            <Wordmark />
            <span className="num text-xs text-stage-muted">{title}</span>
          </div>
          <div className="flex flex-col gap-3">
            <span className="display text-3xl">Top {finish}%</span>
            <RangeMark guess={guess} finish={finish} you className="max-w-64" />
            <span className="text-sm text-stage-muted">
              Guessed top {guess.best}–{guess.worst}% · @{handle}
            </span>
          </div>
        </figure>
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={() =>
              navigator.clipboard?.writeText(text).then(
                () => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1400);
                },
                () => undefined,
              )
            }
          >
            <Icon name={copied ? "check" : "copy"} className="size-4" /> {copied ? "Copied" : "Copy text"}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

function Cell({ cell }: { cell: ContestResultCell }) {
  if (cell.solved) {
    return (
      <span className="flex flex-col items-center leading-4">
        <span className="num text-sm font-semibold text-ok">+{cell.wrongAttempts || ""}</span>
        <span className="num text-2xs text-faint">
          {Math.floor(cell.minute! / 60)}:{String(cell.minute! % 60).padStart(2, "0")}
        </span>
      </span>
    );
  }
  if (cell.wrongAttempts > 0) return <span className="num text-sm text-bad">−{cell.wrongAttempts}</span>;
  return <span className="text-faint">·</span>;
}

function Row({ row }: { row: ContestResultRow }) {
  return (
    <tr className={`border-b border-line ${row.you ? "bg-signal-wash" : "hover:bg-raised"}`} aria-current={row.you ? "true" : undefined}>
      <td className="num py-2.5 pr-3 pl-4 text-right text-sm text-muted">{row.rank}</td>
      <td className="py-2.5 pr-4 text-sm">
        <span className="font-semibold">{row.handle}</span>
        {row.you ? <span className="ml-2 text-xs font-medium text-signal-fg">You</span> : null}
      </td>
      {row.cells.map((cell) => (
        <td key={cell.label} className="py-2.5 text-center">
          <Cell cell={cell} />
        </td>
      ))}
      <td className="num py-2.5 pr-4 text-right text-sm">{row.points}</td>
      <td className="num py-2.5 pr-6 text-right text-sm text-muted">{row.penaltyMinutes}</td>
      <td className="py-2.5 pr-6">
        {row.guess ? (
          <>
            <RangeMark guess={row.guess} finish={row.finish} you={row.you} className="w-40" />
            <span className="num mt-1 block text-2xs text-faint">
              {row.guess.best}–{row.guess.worst} · {pct(row.finish)}
            </span>
          </>
        ) : (
          <span className="text-sm text-faint">No guess · finished {pct(row.finish)}</span>
        )}
      </td>
      <td className={`num py-2.5 pr-4 text-right text-sm ${row.latentDelta > 0 ? "text-ok" : row.latentDelta < 0 ? "text-bad" : "text-muted"}`}>
        {signed(row.latentDelta)}
      </td>
      <td className={`num py-2.5 pr-4 text-right text-sm ${row.formDelta > 0 ? "text-ok" : row.formDelta < 0 ? "text-bad" : "text-muted"}`}>
        {signed(row.formDelta)}
      </td>
    </tr>
  );
}

function Standings({ results }: { results: ContestResults }) {
  const [all, setAll] = useState(false);
  const { rows: standings, contest, you } = results;
  const visible = useMemo(() => {
    if (all) return standings.map((row) => ({ row, gapBefore: false }));
    const rows = standings.filter((r) => r.rank <= 10 || (you !== null && Math.abs(r.rank - you.rank) <= 3));
    return rows.map((row, i) => ({ row, gapBefore: i > 0 && row.rank - rows[i - 1]!.rank > 1 }));
  }, [all, standings, you]);
  const trimmed = visible.length < standings.length || all;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-semibold">Standings</h2>
        {trimmed ? (
          <Button variant="secondary" size="sm" onClick={() => setAll((a) => !a)}>
            {all ? (you ? "Show top and around you" : "Show the top 10") : `Show all ${standings.length}`}
          </Button>
        ) : null}
      </div>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[920px] border-collapse">
          <thead>
            <tr className="border-b border-line bg-raised text-left">
              <th scope="col" className="label py-2.5 pr-3 pl-4 text-right">#</th>
              <th scope="col" className="label py-2.5">Contestant</th>
              {contest.problems.map((p) => (
                <th key={p.label} scope="col" className="label w-14 py-2.5 text-center" title={p.title}>
                  {p.label}
                </th>
              ))}
              <th scope="col" className="label py-2.5 pr-4 text-right">Points</th>
              <th scope="col" className="label py-2.5 pr-6 text-right">Penalty</th>
              <th scope="col" className="label py-2.5 pr-6">Guess and finish</th>
              <th scope="col" className="label py-2.5 pr-4 text-right">Latent</th>
              <th scope="col" className="label py-2.5 pr-4 text-right">Form</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ row, gapBefore }) => (
              <FragmentRow key={row.handle} row={row} gapBefore={gapBefore} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted">
        Brackets show each guessed range, the dot shows the finish. + solved (with the number of wrong attempts), − wrong attempts on an unsolved
        problem.
      </p>
    </section>
  );
}

function FragmentRow({ row, gapBefore }: { row: ContestResultRow; gapBefore: boolean }) {
  return (
    <>
      {gapBefore ? (
        <tr className="border-b border-line">
          <td colSpan={11} className="py-1.5 pl-4 text-sm text-faint">
            ⋯
          </td>
        </tr>
      ) : null}
      <Row row={row} />
    </>
  );
}
