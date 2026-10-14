import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, createMemoryRouter, RouterProvider, type RouteObject } from "react-router";
import { AppShell } from "./components/AppShell";
import { AuthProvider } from "./lib/auth";
import { applyTheme, readTheme } from "./lib/hooks";
import { PrototypeDock } from "./prototype/PrototypeDock";
import { Arena } from "./screens/Arena";
import { ContestList } from "./screens/ContestList";
import { ContestLobby } from "./screens/ContestLobby";
import { Landing } from "./screens/Landing";
import { ProblemList } from "./screens/ProblemList";
import { Profile } from "./screens/Profile";
import { Reveal } from "./screens/Reveal";
import { Welcome } from "./screens/Welcome";
import "./styles/app.css";

// Before the first paint, so a light-theme visitor never sees a dark flash
applyTheme(readTheme());
// Palette previews from an earlier prototype are gone; drop any stored choice
try {
  localStorage.removeItem("cgl-palette");
} catch {
  // Storage unavailable
}

const IS_PROTOTYPE = import.meta.env.MODE === "prototype" || import.meta.env.DEV;

function withDock(element: React.ReactNode) {
  return IS_PROTOTYPE ? (
    <>
      {element}
      <PrototypeDock />
    </>
  ) : (
    element
  );
}

const routes: RouteObject[] = [
  { path: "/", element: withDock(<Landing />) },
  { path: "/welcome", element: <Welcome /> },
  { path: "/problems/:slug", element: withDock(<Arena />) },
  { path: "/contests/:slug/problems/:label", element: withDock(<Arena />) },
  {
    element: withDock(<AppShell />),
    children: [
      { path: "/problems", element: <ProblemList /> },
      { path: "/contests", element: <ContestList /> },
      { path: "/contests/:slug", element: <ContestLobby /> },
      { path: "/contests/:slug/results", element: <Reveal /> },
      { path: "/u/:handle", element: <Profile /> },
    ],
  },
];

// The published prototype lives at a URL we don't control, so it routes in memory
const router = import.meta.env.MODE === "prototype" ? createMemoryRouter(routes) : createBrowserRouter(routes);

// Cached data is shown instantly when you come back to a page, then refreshed in the background
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
