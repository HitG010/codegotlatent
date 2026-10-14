import { useMemo, useRef, useState, type RefObject } from "react";
import { CountUp } from "../components/charts";
import { missBy, predictionScore, RangeMark, RangeRuler } from "../components/Range";
import { Wordmark } from "../components/show";
import { Button, Icon } from "../components/ui";
import { signed } from "../lib/format";
import { HISTORY, ME, ROUND_12, STANDINGS, type ProblemCell, type StandingRow } from "../mock/data";

const MINE = HISTORY[HISTORY.length - 1]!;
const MY_ROW = STANDINGS.find((r) => r.isMe)!;

export function Reveal() {
  const [run, setRun] = useState(0);
  const share = useRef<HTMLDialogElement>(null);
  const miss = missBy(MINE.guess, MINE.finish);
  const width = MINE.guess.worst - MINE.guess.best;
  const score = predictionScore(MINE.guess, MINE.finish);

  return (
    <div className="gutter mx-auto flex max-w-[1240px] flex-col gap-10 py-10">
      {/* The show moment: one statement, one comparison */}
      <section className="grid gap-8 rounded-md bg-stage p-6 text-stage-fg sm:p-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-12">
        <div className="flex flex-col gap-4">
          <span className="text-sm text-stage-muted">{ROUND_12.title} results</span>
          <h1 className="display text-3xl sm:text-4xl">
            You finished top <CountUp key={run} from={50} to={MINE.finish} run={run} />%
          </h1>
          <p className="text-md text-stage-muted">
            You guessed top {MINE.guess.best}–{MINE.guess.worst}%,{" "}
            {miss === 0 ? "so you finished inside your range." : `so you finished ${miss} percentage points outside it.`} Rank{" "}
            <span className="num text-stage-fg">{MY_ROW.rank}</span> of <span className="num text-stage-fg">{MINE.field}</span>.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => share.current?.showModal()}
              className="inline-flex h-10 items-center gap-2 rounded-sm bg-stage-accent px-4 text-base font-semibold text-on-signal"
            >
              Share result
            </button>
            <button
              type="button"
              onClick={() => setRun((r) => r + 1)}
              className="inline-flex h-10 items-center rounded-sm px-3 text-base font-medium text-stage-muted hover:bg-stage-raised hover:text-stage-fg"
            >
              Replay
            </button>
          </div>
        </div>
        <RangeRuler key={run} id="result-range" value={MINE.guess} fieldSize={MINE.field} finish={MINE.finish} tone="stage" />
      </section>

      {/* Each number appears once */}
      <dl className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Prediction score" value={String(score)} note={`${width} for the range's width + ${miss * 10} for finishing outside it. Lower is better.`} />
        <Stat label="Latent rating" value={String(MINE.latentAfter)} delta={MINE.latentDelta} note={`Was ${MINE.latentAfter - MINE.latentDelta}`} />
        <Stat label="Form rating" value={String(MINE.formAfter)} delta={MINE.formDelta} note={`Was ${MINE.formAfter - MINE.formDelta}`} />
        <Stat
          label="Contest points"
          value={String(MY_ROW.score)}
          note={`${MY_ROW.cells.filter((c) => c.solved).length} of ${ROUND_12.problems.length} solved · ${MY_ROW.penaltyMinutes} penalty minutes`}
        />
      </dl>

      <Standings />

      <ShareDialog dialog={share} />
    </div>
  );
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
function ShareDialog({ dialog }: { dialog: RefObject<HTMLDialogElement | null> }) {
  const [copied, setCopied] = useState(false);
  const text = `I guessed top ${MINE.guess.best}–${MINE.guess.worst}% in ${ROUND_12.title} of Code's Got Latent and finished top ${MINE.finish}%.`;
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
            <span className="num text-xs text-stage-muted">{ROUND_12.title}</span>
          </div>
          <div className="flex flex-col gap-3">
            <span className="display text-3xl">Top {MINE.finish}%</span>
            <RangeMark guess={MINE.guess} finish={MINE.finish} you className="max-w-64" />
            <span className="text-sm text-stage-muted">
              Guessed top {MINE.guess.best}–{MINE.guess.worst}% · @{ME.handle}
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

function Cell({ cell }: { cell: ProblemCell }) {
  if (cell.solved) {
    return (
      <span className="flex flex-col items-center leading-4">
        <span className="num text-sm font-semibold text-ok">+{cell.wrong || ""}</span>
        <span className="num text-2xs text-faint">
          {Math.floor(cell.minute! / 60)}:{String(cell.minute! % 60).padStart(2, "0")}
        </span>
      </span>
    );
  }
  if (cell.wrong > 0) return <span className="num text-sm text-bad">−{cell.wrong}</span>;
  return <span className="text-faint">·</span>;
}

function Row({ row }: { row: StandingRow }) {
  return (
    <tr className={`border-b border-line ${row.isMe ? "bg-signal-wash" : "hover:bg-raised"}`} aria-current={row.isMe ? "true" : undefined}>
      <td className="num py-2.5 pr-3 pl-4 text-right text-sm text-muted">{row.rank}</td>
      <td className="py-2.5 pr-4 text-sm">
        <span className="font-semibold">{row.handle}</span>
        {row.isMe ? <span className="ml-2 text-xs font-medium text-signal-fg">You</span> : null}
      </td>
      {row.cells.map((cell, i) => (
        <td key={i} className="py-2.5 text-center">
          <Cell cell={cell} />
        </td>
      ))}
      <td className="num py-2.5 pr-4 text-right text-sm">{row.score}</td>
      <td className="num py-2.5 pr-6 text-right text-sm text-muted">{row.penaltyMinutes}</td>
      <td className="py-2.5 pr-6">
        <RangeMark guess={row.guess} finish={row.finish} you={row.isMe} className="w-40" />
        <span className="num mt-1 block text-2xs text-faint">
          {row.guess.best}–{row.guess.worst} · {row.finish}
        </span>
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

function Standings() {
  const [all, setAll] = useState(false);
  const visible = useMemo(() => {
    if (all) return STANDINGS.map((row) => ({ row, gapBefore: false }));
    const rows = STANDINGS.filter((r) => r.rank <= 10 || Math.abs(r.rank - MY_ROW.rank) <= 3);
    return rows.map((row, i) => ({ row, gapBefore: i > 0 && row.rank - rows[i - 1]!.rank > 1 }));
  }, [all]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-semibold">Standings</h2>
        <Button variant="secondary" size="sm" onClick={() => setAll((a) => !a)}>
          {all ? "Show top and around you" : `Show all ${STANDINGS.length}`}
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[920px] border-collapse">
          <thead>
            <tr className="border-b border-line bg-raised text-left">
              <th scope="col" className="label py-2.5 pr-3 pl-4 text-right">#</th>
              <th scope="col" className="label py-2.5">Contestant</th>
              {ROUND_12.problems.map((p) => (
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
              <FragmentRow key={row.rank} row={row} gapBefore={gapBefore} />
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

function FragmentRow({ row, gapBefore }: { row: StandingRow; gapBefore: boolean }) {
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
