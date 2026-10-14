import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../lib/hooks";
import { type ContestRecord, isHit } from "../mock/data";

/** A headline number that counts from `from` to `to` once per `run`. */
export function CountUp({ to, from, run, durationMs = 1100 }: { to: number; from: number; run: number; durationMs?: number }) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(reduced ? to : from);
  const frame = useRef(0);

  useEffect(() => {
    if (reduced) {
      setShown(to);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setShown(Math.round(from + (to - from) * (1 - (1 - t) ** 3)));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    setShown(from);
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [to, from, run, durationMs, reduced]);

  return <span className="tabular-nums">{shown}</span>;
}

/**
 * Every guess against its finish, round by round, in the same marks as the
 * guess ruler turned upright: the range between ⊓ and ⊔, the finish as a dot.
 * Rounds are selectable.
 */
export function RangeTimeline({
  records,
  selected,
  onSelect,
}: {
  records: ContestRecord[];
  selected: number;
  onSelect: (round: number) => void;
}) {
  // Show down to the next quarter below the worst value plotted, so the guesses fill the chart
  const deepest = Math.max(...records.flatMap((r) => [r.guess.worst, r.finish]));
  const floor = Math.min(100, Math.ceil((deepest + 5) / 25) * 25);
  const pos = (percentile: number) => `${(percentile / floor) * 100}%`;
  const ticks = [0, 25, 50, 75, 100].filter((t) => t <= floor);

  return (
    <figure className="flex flex-col gap-3">
      <div className="grid grid-cols-[3rem_1fr]">
        <div className="relative h-80" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="num absolute right-3 -translate-y-1/2 text-2xs text-faint" style={{ top: pos(t) }}>
              {t === 0 ? "Top" : t === 100 ? "Last" : `${t}%`}
            </span>
          ))}
        </div>
        <div className="relative h-80 border-y border-line">
          {ticks.slice(1, -1).map((t) => (
            <div key={t} className="absolute inset-x-0 h-px bg-line" style={{ top: pos(t) }} />
          ))}
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${records.length}, minmax(0, 1fr))` }}>
            {records.map((record) => {
              const hit = isHit(record);
              const active = record.round === selected;
              const marks = hit ? "border-signal" : "border-muted";
              const nearest = record.finish < record.guess.best ? record.guess.best : record.guess.worst;
              return (
                <button
                  key={record.round}
                  type="button"
                  aria-pressed={active}
                  aria-label={`Round ${record.round}: guessed top ${record.guess.best}–${record.guess.worst}%, finished top ${record.finish}%`}
                  onClick={() => onSelect(record.round)}
                  className={`relative transition-colors ${active ? "bg-hover" : "hover:bg-raised"}`}
                >
                  <span
                    className={`absolute left-1/2 w-4 -translate-x-1/2 ${hit ? "bg-signal-wash" : ""}`}
                    style={{ top: pos(record.guess.best), height: pos(record.guess.worst - record.guess.best) }}
                  />
                  <span className={`absolute left-1/2 h-1.5 w-4 -translate-x-1/2 border-x-2 border-t-2 ${marks}`} style={{ top: pos(record.guess.best) }} />
                  <span
                    className={`absolute left-1/2 h-1.5 w-4 -translate-x-1/2 -translate-y-full border-x-2 border-b-2 ${marks}`}
                    style={{ top: pos(record.guess.worst) }}
                  />
                  {hit ? null : (
                    <span
                      className="absolute left-1/2 w-0 -translate-x-1/2 border-l border-dashed border-faint"
                      style={{ top: pos(Math.min(record.finish, nearest)), height: pos(Math.abs(record.finish - nearest)) }}
                    />
                  )}
                  <span
                    className="absolute left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg bg-fg"
                    style={{ top: pos(record.finish) }}
                  />
                </button>
              );
            })}
          </div>
        </div>
        <div />
        <div className="grid pt-2" style={{ gridTemplateColumns: `repeat(${records.length}, minmax(0, 1fr))` }}>
          {records.map((record) => (
            <span key={record.round} className={`num text-center text-2xs ${record.round === selected ? "text-fg" : "text-faint"}`}>
              R{record.round}
            </span>
          ))}
        </div>
      </div>
      <figcaption className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-2.5 border-2 border-signal" /> Guessed range, finished inside
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-2.5 border-2 border-muted" /> Finished outside
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-fg" /> Finish
        </span>
      </figcaption>
    </figure>
  );
}

export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const W = 120;
  const H = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((v, i) => [(i / (values.length - 1)) * (W - 4) + 2, H - 4 - ((v - min) / span) * (H - 8)] as const);
  const last = points[points.length - 1]!;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={label} className="overflow-visible">
      <polyline points={points.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke="var(--fg-muted)" strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill="var(--fg)" />
    </svg>
  );
}
