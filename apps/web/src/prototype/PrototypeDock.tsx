import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router";


const SCREENS = [
  { to: "/", label: "Landing" },
  { to: "/problems", label: "Problems" },
  { to: "/problems/self-aware", label: "Editor" },
  { to: "/contests", label: "Contests" },
  { to: "/contests/round-12", label: "Lobby" },
  { to: "/contests/round-12/results", label: "Reveal" },
  { to: "/u/hitesh", label: "Profile" },
];

/** Review chrome for the prototype build only: jump between the screens. */
export function PrototypeDock() {
  const location = useLocation();
  const [open, setOpen] = useState(true);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <nav
      aria-label="Prototype screens"
      className="fixed right-[max(12px,env(safe-area-inset-right,0px))] bottom-[max(12px,env(safe-area-inset-bottom,0px))] z-50 flex max-w-[calc(100vw-24px)] items-center gap-1 rounded-md border border-dashed border-line-strong bg-raised p-1 shadow-pop"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="label h-7 shrink-0 rounded-sm px-2 hover:bg-hover hover:text-fg"
      >
        {open ? "Prototype ×" : "Screens"}
      </button>
      {open ? (
        <div className="flex gap-1 overflow-x-auto">
          {SCREENS.map((screen) => (
            <NavLink
              key={screen.to}
              to={screen.to}
              end
              className={({ isActive }) =>
                `flex h-7 shrink-0 items-center rounded-sm px-2.5 text-sm ${isActive ? "bg-hover text-fg font-semibold" : "text-muted hover:text-fg"}`
              }
            >
              {screen.label}
            </NavLink>
          ))}
        </div>
      ) : null}
    </nav>
  );
}
