import type { Verdict } from "@cgl/shared";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-signal text-on-signal hover:brightness-[0.93] active:brightness-[0.88]",
  secondary: "border border-line-strong bg-raised text-fg hover:bg-hover",
  ghost: "text-muted hover:bg-hover hover:text-fg",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-base gap-2",
  lg: "h-12 px-5 text-md gap-2.5",
};

export function buttonClass(variant: Variant = "secondary", size: Size = "md", extra = ""): string {
  return [
    "inline-flex shrink-0 select-none items-center justify-center rounded-sm font-semibold whitespace-nowrap",
    "transition-[background-color,color,filter] duration-150 ease-out",
    "disabled:pointer-events-none disabled:opacity-45",
    VARIANTS[variant],
    SIZES[size],
    extra,
  ].join(" ");
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  shortcut?: string;
}

export function Button({ variant, size, shortcut, className = "", children, type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...rest}>
      {children}
      {shortcut ? <Kbd>{shortcut}</Kbd> : null}
    </button>
  );
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
}

export function ButtonLink({ variant, size, className = "", ...rest }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-sm border border-current/25 px-1 font-mono text-2xs font-normal opacity-70">
      {children}
    </kbd>
  );
}

// ─── Verdicts ─────────────────────────────────────────────────────────────

export const VERDICT_CODE: Record<Verdict, string> = {
  ACCEPTED: "AC",
  WRONG_ANSWER: "WA",
  TIME_LIMIT_EXCEEDED: "TLE",
  MEMORY_LIMIT_EXCEEDED: "MLE",
  RUNTIME_ERROR: "RE",
  COMPILATION_ERROR: "CE",
  INTERNAL_ERROR: "IE",
};

export const VERDICT_LABEL: Record<Verdict, string> = {
  ACCEPTED: "Accepted",
  WRONG_ANSWER: "Wrong answer",
  TIME_LIMIT_EXCEEDED: "Time limit exceeded",
  MEMORY_LIMIT_EXCEEDED: "Memory limit exceeded",
  RUNTIME_ERROR: "Runtime error",
  COMPILATION_ERROR: "Compilation error",
  INTERNAL_ERROR: "Judge error",
};

export const VERDICT_TEXT: Record<Verdict, string> = {
  ACCEPTED: "text-ok",
  WRONG_ANSWER: "text-bad",
  TIME_LIMIT_EXCEEDED: "text-slow",
  MEMORY_LIMIT_EXCEEDED: "text-slow",
  RUNTIME_ERROR: "text-crash",
  COMPILATION_ERROR: "text-neutral",
  INTERNAL_ERROR: "text-neutral",
};

/** Judge-log style verdict code: AC, WA, TLE… */
export function VerdictChip({ verdict }: { verdict: Verdict }) {
  return (
    <span
      title={VERDICT_LABEL[verdict]}
      className={`inline-flex h-5 min-w-9 items-center justify-center rounded-sm border border-current/35 px-1.5 font-mono text-2xs font-bold ${VERDICT_TEXT[verdict]}`}
    >
      {VERDICT_CODE[verdict]}
    </span>
  );
}

// ─── Small pieces ─────────────────────────────────────────────────────────

export function Meter({ value, total, tone = "fg" }: { value: number; total: number; tone?: "fg" | "signal" }) {
  const pct = total === 0 ? 0 : Math.min(100, (100 * value) / total);
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-line" role="presentation">
      <div className={`h-full ${tone === "signal" ? "bg-signal" : "bg-fg"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-sm border border-line bg-sunken p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={`h-8 rounded-[2px] px-3 text-sm whitespace-nowrap transition-colors ${
            option.value === value ? "bg-raised text-fg shadow-[0_0_0_1px_var(--line-strong)]" : "text-muted hover:text-fg"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const ICONS = {
  search: "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.35-4.35",
  check: "M5 12.5 10 17l9-10",
  copy: "M9 9h10v10H9zM5 15V5h10",
  sun: "M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14-1.41-1.41M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z",
  play: "M7 5v14l11-7z",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  back: "M19 12H5m6-6-6 6 6 6",
  lock: "M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
} as const;

export function Icon({ name, className = "size-4" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}
