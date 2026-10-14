import { useEffect, useState } from "react";

/** Current time, re-read every `intervalMs`. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export type Theme = "dark" | "light";

/** Dark unless this browser chose light. */
export function readTheme(): Theme {
  try {
    return localStorage.getItem("cgl-theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/**
 * Dark is the default design, so only light needs marking. We use our own
 * attribute and never touch data-theme, which a host page may own.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "light") root.setAttribute("data-cgl-theme", "light");
  else root.removeAttribute("data-cgl-theme");
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    applyTheme(theme);
    try {
      if (theme === "light") localStorage.setItem("cgl-theme", "light");
      else localStorage.removeItem("cgl-theme");
    } catch {
      // Storage can be unavailable (private windows); the choice still applies for this visit
    }
  }, [theme]);
  return [theme, setTheme];
}
