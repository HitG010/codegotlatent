// Broadcast pieces: the wordmark, tally light, countdown and phase bar.
import type { ContestPhase } from "@cgl/shared";
import { timecode } from "../lib/format";
import { useNow } from "../lib/hooks";

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-fg">
      <span
        aria-hidden="true"
        className="grid h-7 w-8 place-items-center rounded-sm bg-signal font-mono text-[14px] font-bold tracking-[-0.08em] text-on-signal"
      >
        {"{}"}
      </span>
      {compact ? null : (
        <span className="display text-[21px] leading-none tracking-[0.02em] whitespace-nowrap uppercase">Code's Got Latent</span>
      )}
    </span>
  );
}

/** The studio's on-air light. Red only while something is live. */
export function Tally({ tone }: { tone: "onair" | "signal" | "idle" }) {
  const colour = tone === "onair" ? "bg-onair" : tone === "signal" ? "bg-signal" : "bg-faint";
  return <span aria-hidden="true" className={`inline-block size-2 rounded-full ${colour} ${tone === "onair" ? "tally" : ""}`} />;
}

export function Countdown({ to, className = "" }: { to: Date; className?: string }) {
  const now = useNow();
  return (
    <time dateTime={to.toISOString()} className={`num ${className}`}>
      {timecode(to.getTime() - now)}
    </time>
  );
}

const PHASES: { phase: ContestPhase; label: string }[] = [
  { phase: "SCHEDULED", label: "Registration" },
  { phase: "GUESS_WINDOW", label: "Guess window" },
  { phase: "LIVE", label: "Live" },
  { phase: "JUDGING", label: "Judging" },
  { phase: "RESULTS", label: "Results" },
];

/** Where the show is in its running order. Times are relative to the start, like a rundown. */
export function PhaseBar({ phase, marks }: { phase: ContestPhase; marks: Record<ContestPhase, string> }) {
  const current = PHASES.findIndex((p) => p.phase === phase);
  const now = PHASES[current]!;
  const next = PHASES[current + 1];
  const tone = phase === "LIVE" ? "onair" : "signal";
  return (
    <>
      {/* Phones: a five-segment strip, naming only where we are and what's next */}
      <div className="flex flex-col gap-2.5 border-y border-line py-3 sm:hidden">
        <div className="flex gap-1" aria-hidden="true">
          {PHASES.map((p, i) => (
            <span key={p.phase} className={`h-1 flex-1 rounded-full ${i < current ? "bg-muted" : i === current ? (tone === "onair" ? "bg-onair" : "bg-signal") : "bg-line-strong"}`} />
          ))}
        </div>
        <p className="flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2 font-semibold">
            <Tally tone={tone} /> {now.label}
          </span>
          {next ? (
            <span className="text-muted">
              Next: {next.label} <span className="num text-faint">{marks[next.phase]}</span>
            </span>
          ) : null}
        </p>
      </div>
    <ol className="hidden grid-cols-5 border-y border-line sm:grid">
      {PHASES.map((p, i) => {
        const state = i < current ? "past" : i === current ? "now" : "next";
        const stepTone = p.phase === "LIVE" ? "onair" : "signal";
        return (
          <li
            key={p.phase}
            aria-current={state === "now" ? "step" : undefined}
            className={`relative flex min-w-0 flex-col gap-0.5 px-2 py-2.5 sm:px-3 ${i > 0 ? "border-l border-line" : ""}`}
          >
            {state === "now" ? (
              <span className={`absolute inset-x-0 -top-px h-0.5 ${stepTone === "onair" ? "bg-onair" : "bg-signal"}`} />
            ) : null}
            <span className={`flex items-center gap-1.5 truncate text-sm ${state === "next" ? "text-faint" : state === "past" ? "text-muted" : "text-fg font-semibold"}`}>
              {state === "now" ? <Tally tone={stepTone} /> : null}
              <span className="truncate">{p.label}</span>
            </span>
            <span className="num hidden truncate text-2xs text-muted sm:block">{marks[p.phase]}</span>
          </li>
        );
      })}
    </ol>
    </>
  );
}
