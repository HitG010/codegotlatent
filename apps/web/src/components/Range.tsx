// The prediction's visual language, used on every screen: your range is two
// boundary marks, [ and ], and your finish is a dot.
import { DEFAULT_RATING_CONFIG, intervalScore } from "@cgl/rating";
import { MIN_GUESS_WIDTH, type PercentileGuess } from "@cgl/shared";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { rankSpan } from "../lib/format";

const { alpha } = DEFAULT_RATING_CONFIG;
/** Prediction score added per percentage point you finish outside your range. */
export const MISS_COST = 2 / alpha;

export function predictionScore(guess: PercentileGuess, finish: number): number {
  return intervalScore(guess, finish, alpha);
}

export function missBy(guess: PercentileGuess, finish: number): number {
  if (finish < guess.best) return guess.best - finish;
  if (finish > guess.worst) return finish - guess.worst;
  return 0;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const TICKS = Array.from({ length: 21 }, (_, i) => i * 5);
const LANDMARKS = [
  { at: 0, text: "Top" },
  { at: 25, text: "25%" },
  { at: 50, text: "50%" },
  { at: 75, text: "75%" },
  { at: 100, text: "Last" },
];

type Drag = { kind: "best" | "worst" } | { kind: "band"; grabAt: number; from: PercentileGuess };

interface RangeRulerProps {
  id: string;
  value: PercentileGuess;
  fieldSize: number;
  /** Omit for a read-only ruler. */
  onChange?: (guess: PercentileGuess) => void;
  /** Where the player finished, once known. */
  finish?: number | undefined;
  /** "stage" when drawn on the oxblood show surfaces. */
  tone?: "default" | "stage";
}

/** The guess control: a ruler from first place to last, with draggable brackets and typed endpoints. */
export function RangeRuler({ id, value, fieldSize, onChange, finish, tone = "default" }: RangeRulerProps) {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const editable = onChange !== undefined;
  const { best, worst } = value;
  const stage = tone === "stage";

  function percentAt(clientX: number): number {
    const rect = track.current!.getBoundingClientRect();
    return clamp(Math.round(((clientX - rect.left) / rect.width) * 100), 0, 100);
  }

  function apply(next: PercentileGuess) {
    if (next.best !== best || next.worst !== worst) onChange?.(next);
  }

  function move(kind: "best" | "worst", to: number) {
    if (kind === "best") apply({ best: clamp(to, 0, worst - MIN_GUESS_WIDTH), worst });
    else apply({ best, worst: clamp(to, best + MIN_GUESS_WIDTH, 100) });
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!editable || event.button !== 0) return;
    const at = percentAt(event.clientX);
    const part = (event.target as HTMLElement).closest<HTMLElement>("[data-part]")?.dataset["part"];
    if (part === "best" || part === "worst") drag.current = { kind: part };
    else if (part === "band") drag.current = { kind: "band", grabAt: at, from: value };
    else {
      const kind = Math.abs(at - best) <= Math.abs(at - worst) ? "best" : "worst";
      drag.current = { kind };
      move(kind, at);
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current) return;
    const at = percentAt(event.clientX);
    if (current.kind === "band") {
      const width = current.from.worst - current.from.best;
      const start = clamp(current.from.best + at - current.grabAt, 0, 100 - width);
      apply({ best: start, worst: start + width });
    } else {
      move(current.kind, at);
    }
  }

  function onKeyDown(kind: "best" | "worst", event: KeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 5 : 1;
    const from = kind === "best" ? best : worst;
    const to = { ArrowLeft: from - step, ArrowDown: from - step, ArrowRight: from + step, ArrowUp: from + step, Home: 0, End: 100 }[
      event.key
    ];
    if (to === undefined) return;
    event.preventDefault();
    move(kind, to);
  }

  const markColour = stage ? "border-stage-accent" : "border-signal";
  const tabColour = stage ? "bg-stage-accent" : "bg-signal";

  const boundary = (kind: "best" | "worst", at: number) => (
    <div
      data-part={kind}
      className={`absolute top-0 bottom-0 z-10 w-8 -translate-x-1/2 ${editable ? "cursor-ew-resize" : "pointer-events-none"}`}
      style={{ left: `${at}%` }}
    >
      {/* The bracket: a bar with caps pointing into the range */}
      <span
        aria-hidden="true"
        className={`absolute top-3 bottom-1 w-2 ${markColour} ${
          kind === "best" ? "left-1/2 -ml-px border-y-2 border-l-2" : "right-1/2 -mr-px border-y-2 border-r-2"
        }`}
      />
      {editable ? (
        <button
          type="button"
          role="slider"
          data-part={kind}
          aria-label={kind === "best" ? "Best finish" : "Worst finish"}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={at}
          aria-valuetext={`Top ${at}%`}
          onKeyDown={(event) => onKeyDown(kind, event)}
          className={`absolute top-0 left-1/2 h-3 w-5 -translate-x-1/2 rounded-t-[4px] ${tabColour} focus-visible:outline-offset-4`}
        />
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col gap-1.5">
      <div
        ref={track}
        id={id}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        className={`relative h-[72px] touch-none select-none ${editable ? "cursor-crosshair" : ""}`}
      >
        <div
          className={`absolute inset-x-0 top-4 bottom-2 rounded-sm border ${stage ? "border-stage-line bg-[rgb(0_0_0/0.28)]" : "border-line bg-sunken"}`}
        />
        <Ticks className="absolute inset-x-0 top-4 bottom-2" stroke={stage ? "var(--stage-line)" : "var(--line-strong)"} />
        <Ticks
          className="absolute inset-x-0 top-4 bottom-2"
          stroke={stage ? "var(--stage-accent)" : "var(--signal-line)"}
          clip={`inset(0 ${100 - worst}% 0 ${best}%)`}
        />
        <div
          data-part="band"
          className={`absolute top-4 bottom-2 ${stage ? "bg-[rgb(255_201_82/0.12)]" : "bg-signal-wash"} ${editable ? "cursor-grab active:cursor-grabbing" : ""}`}
          style={{ left: `${best}%`, width: `${worst - best}%` }}
        />
        {boundary("best", best)}
        {boundary("worst", worst)}
        {finish !== undefined ? <FinishDot at={finish} stage={stage} /> : null}
      </div>
      <div className="relative h-4" aria-hidden="true">
        {LANDMARKS.map((mark) => (
          <span
            key={mark.at}
            className={`num absolute text-2xs ${stage ? "text-stage-muted" : "text-faint"}`}
            style={{
              left: `${mark.at}%`,
              transform: mark.at === 0 ? "none" : mark.at === 100 ? "translateX(-100%)" : "translateX(-50%)",
            }}
          >
            {mark.text}
          </span>
        ))}
      </div>
      {editable ? <EndpointFields id={id} value={value} fieldSize={fieldSize} onMove={move} /> : null}
    </div>
  );
}

function Ticks({ className, stroke, clip }: { className: string; stroke: string; clip?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 10"
      preserveAspectRatio="none"
      className={`pointer-events-none ${className}`}
      style={clip ? { clipPath: clip } : undefined}
    >
      {TICKS.map((t) => (
        <line
          key={t}
          x1={t}
          x2={t}
          y1={t % 25 === 0 ? 3 : 6.5}
          y2={10}
          stroke={stroke}
          strokeWidth={t % 25 === 0 ? 1.5 : 1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

function FinishDot({ at, stage }: { at: number; stage: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute z-20 size-4 rounded-full border-[3px] ${stage ? "border-stage bg-stage-fg" : "border-bg bg-fg"} [animation:land_420ms_var(--ease)_both]`}
      style={{ left: `${at}%`, top: "calc(1rem + (100% - 1.5rem) / 2)", transform: "translate(-50%, -50%)" }}
    />
  );
}

/** Typed endpoints, for people who'd rather enter numbers than drag. */
function EndpointFields({
  id,
  value,
  fieldSize,
  onMove,
}: {
  id: string;
  value: PercentileGuess;
  fieldSize: number;
  onMove: (kind: "best" | "worst", to: number) => void;
}) {
  const [first, last] = rankSpan(value.best, value.worst, fieldSize);
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <div className="flex items-center gap-2 text-md">
        <span>Top</span>
        <PercentField id={`${id}-best`} label="Best finish, as a top percentage" value={value.best} onCommit={(n) => onMove("best", n)} />
        <span>to</span>
        <PercentField id={`${id}-worst`} label="Worst finish, as a top percentage" value={value.worst} onCommit={(n) => onMove("worst", n)} />
        <span>%</span>
      </div>
      <p className="text-sm text-muted">
        <span className="num text-fg">{value.worst - value.best}</span> percentage points wide · about rank{" "}
        <span className="num text-fg">
          {first}–{last}
        </span>{" "}
        of <span className="num">{fieldSize}</span>
      </p>
    </div>
  );
}

function PercentField({ id, label, value, onCommit }: { id: string; label: string; value: number; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = Number.parseInt(draft, 10);
    if (Number.isFinite(n)) onCommit(clamp(n, 0, 100));
    else setDraft(String(value));
  };
  return (
    <input
      id={id}
      aria-label={label}
      inputMode="numeric"
      value={draft}
      onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          onCommit(clamp(value + (e.key === "ArrowUp" ? 1 : -1), 0, 100));
        }
      }}
      className="num h-10 w-14 rounded-sm border border-line-strong bg-sunken text-center text-md focus:border-signal focus:outline-none"
    />
  );
}

/** Scoring, explained on request rather than up front. */
export function ScoringDetails({ guess, finish, open = false }: { guess: PercentileGuess; finish?: number | undefined; open?: boolean }) {
  const W = 400;
  const H = 72;
  const cap = 120;
  const y = (score: number) => H - 4 - (Math.min(score, cap) / cap) * (H - 8);
  const points = Array.from({ length: 101 }, (_, x) => `${(x / 100) * W},${y(predictionScore(guess, x))}`).join(" ");
  const floor = y(guess.worst - guess.best);
  return (
    <details className="group rounded-md border border-line" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-muted hover:text-fg">
        How is this scored?
        <span aria-hidden="true" className="text-faint transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="flex flex-col gap-3 border-t border-line px-4 pt-3 pb-4">
        <p className="text-sm text-muted">
          If you finish inside your range, your prediction score is the range's width:{" "}
          <span className="num text-fg">{guess.worst - guess.best}</span> here. Each percentage point you finish
          outside adds <span className="num text-fg">{MISS_COST}</span>. Lower is better. A narrow range scores well
          only if you land in it.
        </p>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-[72px] w-full"
          role="img"
          aria-label="Prediction score for each possible finish: lowest inside your range, rising steeply outside it"
        >
          <line x1={0} x2={W} y1={H - 4} y2={H - 4} stroke="var(--line)" vectorEffect="non-scaling-stroke" />
          <polyline points={points} fill="none" stroke="var(--fg-muted)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          <line
            x1={(guess.best / 100) * W}
            x2={(guess.worst / 100) * W}
            y1={floor}
            y2={floor}
            stroke="var(--signal)"
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
          />
          {finish !== undefined ? (
            <line x1={(finish / 100) * W} x2={(finish / 100) * W} y1={0} y2={H} stroke="var(--fg)" vectorEffect="non-scaling-stroke" />
          ) : null}
        </svg>
        <p className="text-2xs text-faint">Prediction score for every possible finish, from first place to last.</p>
      </div>
    </details>
  );
}

/** The same marks at table and card size. */
export function RangeMark({
  guess,
  finish,
  you = false,
  className = "",
}: {
  guess: PercentileGuess;
  finish?: number | undefined;
  you?: boolean;
  className?: string;
}) {
  const colour = you ? "border-signal" : "border-muted";
  return (
    <span
      role="img"
      aria-label={`Guessed top ${guess.best}–${guess.worst}%${finish === undefined ? "" : `, finished top ${finish}%`}`}
      className={`relative block h-3.5 min-w-24 ${className}`}
    >
      <span className="absolute inset-x-0 top-1/2 h-px bg-line-strong" />
      <span className={`absolute inset-y-0 w-1 border-y-[1.5px] border-l-[1.5px] ${colour}`} style={{ left: `${guess.best}%` }} />
      <span className={`absolute inset-y-0 w-1 -translate-x-full border-y-[1.5px] border-r-[1.5px] ${colour}`} style={{ left: `${guess.worst}%` }} />
      {finish !== undefined ? (
        <span className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg" style={{ left: `${finish}%` }} />
      ) : null}
    </span>
  );
}
