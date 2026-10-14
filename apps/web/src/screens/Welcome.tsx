import { handleSchema, type SessionUser } from "@cgl/shared";
import { type FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { Wordmark } from "../components/show";
import { Button } from "../components/ui";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";

/** First sign-in: pick the handle shown in standings and profile links. */
export function Welcome() {
  const { state, setUser } = useAuth();
  const navigate = useNavigate();
  const user = state.status === "signed-in" ? state.user : null;
  const [handle, setHandle] = useState(user?.handle ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (state.status === "loading") return null;
  if (!user) return <Navigate to="/" replace />;

  const check = handleSchema.safeParse(handle);
  const hint = handle && !check.success ? check.error.issues[0]?.message : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!check.success) return;
    setSaving(true);
    setError(null);
    try {
      const { user: updated } = await api<{ user: SessionUser }>("/me/handle", {
        method: "PATCH",
        body: JSON.stringify({ handle: check.data }),
      });
      setUser(updated);
      navigate("/problems", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your handle. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="gutter mx-auto flex h-16 w-full max-w-[1240px] items-center">
        <Wordmark />
      </header>
      <main className="gutter mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center gap-8 pb-24">
        <div className="flex flex-col gap-3">
          <h1 className="display text-3xl">Pick your handle</h1>
          <p className="text-md text-muted">
            It's how you appear in standings, and your profile lives at <span className="num text-fg">/u/{check.success ? check.data : "…"}</span>.
          </p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
          <label htmlFor="handle" className="label">
            Handle
          </label>
          <input
            id="handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={Boolean(hint || error)}
            aria-describedby="handle-help"
            className="num h-12 rounded-sm border border-line-strong bg-sunken px-3 text-md focus:border-signal focus:outline-none"
          />
          <p id="handle-help" className={`text-sm ${hint || error ? "text-bad" : "text-muted"}`} aria-live="polite">
            {error ?? hint ?? "3–20 characters: lowercase letters, digits and underscores."}
          </p>
          <Button type="submit" variant="primary" size="lg" disabled={!check.success || saving} className="mt-2 self-start">
            {saving ? "Saving…" : "Continue"}
          </Button>
        </form>
      </main>
    </div>
  );
}
