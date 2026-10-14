import type { ReactNode } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useAuth, useUser } from "../lib/auth";
import { useTheme } from "../lib/hooks";
import { ROUND_12 } from "../mock/data";
import { Countdown, Tally, Wordmark } from "./show";
import { Icon } from "./ui";

export function ThemeButton() {
  const [theme, setTheme] = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="grid size-8 place-items-center rounded-sm text-muted hover:bg-hover hover:text-fg"
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} />
    </button>
  );
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts.length > 1 ? parts[0]![0]! + parts[parts.length - 1]![0]! : name.slice(0, 1)).toUpperCase();
}

export function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "lg" }) {
  const big = size === "lg";
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-sm border border-line-strong bg-raised font-mono font-bold text-muted uppercase ${big ? "size-16 text-xl" : "size-8 text-xs"}`}
    >
      {initials(name)}
    </span>
  );
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `relative flex h-16 items-center px-1 text-base transition-colors ${isActive ? "text-fg font-semibold" : "text-muted hover:text-fg"}`;

export function TopBar({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-30 border-b border-line bg-bg">
      <div className="gutter mx-auto flex h-16 max-w-[1240px] items-center gap-6">
        <Link to="/problems" aria-label="Code's Got Latent home" className="shrink-0">
          <span className="hidden md:inline">
            <Wordmark />
          </span>
          <span className="md:hidden">
            <Wordmark compact />
          </span>
        </Link>
        <nav className="flex items-center gap-4" aria-label="Main">
          <NavLink to="/problems" className={navClass}>
            Problems
          </NavLink>
          <NavLink to={`/contests/${ROUND_12.slug}`} className={navClass}>
            Contests
          </NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {children}
          <Link
            to={`/contests/${ROUND_12.slug}`}
            className="hidden h-9 items-center gap-2 rounded-sm border border-line px-3 text-sm text-muted hover:bg-hover hover:text-fg lg:inline-flex"
          >
            <Tally tone="signal" />
            <span>{ROUND_12.title} starts in</span>
            <Countdown to={ROUND_12.startsAt} className="text-fg" />
          </Link>
          <ThemeButton />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

/** Signed in: your initials, opening profile and sign-out. Signed out: a way to sign in. */
export function AccountMenu() {
  const user = useUser();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) {
    return (
      <Link to="/" className="inline-flex h-9 items-center rounded-sm border border-line-strong px-3 text-sm font-semibold hover:bg-hover">
        Sign in
      </Link>
    );
  }
  return (
    <details className="relative">
      <summary className="list-none rounded-sm [&::-webkit-details-marker]:hidden" aria-label="Account">
        <Avatar name={user.name ?? user.handle} />
      </summary>
      <div className="absolute right-0 z-40 mt-2 flex w-56 flex-col rounded-md border border-line-strong bg-raised p-1 shadow-pop">
        <span className="px-3 pt-2 pb-1 text-sm font-semibold">{user.handle}</span>
        <Link to={`/u/${user.handle}`} className="rounded-sm px-3 py-2 text-sm text-muted hover:bg-hover hover:text-fg">
          Profile
        </Link>
        <button
          type="button"
          onClick={async () => {
            await signOut();
            navigate("/");
          }}
          className="rounded-sm px-3 py-2 text-left text-sm text-muted hover:bg-hover hover:text-fg"
        >
          Sign out
        </button>
      </div>
    </details>
  );
}

export function AppShell() {
  return (
    <div className="flex min-h-full flex-col">
      <TopBar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

/** Page title block: a mono caption above a tight display heading. */
export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow ? <span className="label">{eyebrow}</span> : null}
        <h1 className="display text-3xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}
