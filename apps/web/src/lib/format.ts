const MINUS = "−";

/** Rating change with a real minus sign: +18, −7, ±0. */
export function signed(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${MINUS}${Math.abs(delta)}`;
  return "±0";
}

/** Countdown as a broadcast timecode: 01:23:45, or 2d 04:12:09 past a day. */
export function timecode(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hh = String(Math.floor((total % 86400) / 3600)).padStart(2, "0");
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return days > 0 ? `${days}d ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
}

/** "Sat 18 Oct, 20:00" in the viewer's time zone. */
export function showTime(date: Date): string {
  const day = date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${day}, ${time}`;
}

/** 1h 12m / 48m */
export function duration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

/** Ranks covered by a percentile range in a field: top 15–30% of 143 → 22–43. */
export function rankSpan(best: number, worst: number, fieldSize: number): [number, number] {
  const first = Math.max(1, Math.ceil((best / 100) * fieldSize));
  const last = Math.max(first, Math.round((worst / 100) * fieldSize));
  return [first, last];
}
