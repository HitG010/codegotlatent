import type { SessionUser } from "@cgl/shared";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ME } from "../mock/data";
import { API_URL, refreshSession, signInWithGoogle, signOut as endSession } from "./api";

export type AuthState = { status: "loading" } | { status: "signed-out" } | { status: "signed-in"; user: SessionUser };

interface Auth {
  state: AuthState;
  /** False in the prototype build, which signs everyone in as the sample user. */
  live: boolean;
  signIn: (googleCredential: string) => Promise<SessionUser>;
  signOut: () => Promise<void>;
  setUser: (user: SessionUser) => void;
}

const SAMPLE_USER: SessionUser = { id: "sample", handle: ME.handle, name: ME.name, role: "USER", handleConfirmed: true };

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const live = API_URL !== undefined;
  const [state, setState] = useState<AuthState>(live ? { status: "loading" } : { status: "signed-in", user: SAMPLE_USER });

  useEffect(() => {
    if (!live) return;
    void refreshSession().then(
      (user) => setState(user ? { status: "signed-in", user } : { status: "signed-out" }),
      () => setState({ status: "signed-out" }),
    );
  }, [live]);

  const signIn = useCallback(
    async (credential: string) => {
      const user = live ? await signInWithGoogle(credential) : SAMPLE_USER;
      setState({ status: "signed-in", user });
      return user;
    },
    [live],
  );

  const signOut = useCallback(async () => {
    if (live) await endSession();
    setState({ status: "signed-out" });
  }, [live]);

  const setUser = useCallback((user: SessionUser) => setState({ status: "signed-in", user }), []);

  const value = useMemo(() => ({ state, live, signIn, signOut, setUser }), [state, live, signIn, signOut, setUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth needs an AuthProvider");
  return auth;
}

/** The signed-in user, or null while loading or signed out. */
export function useUser(): SessionUser | null {
  const { state } = useAuth();
  return state.status === "signed-in" ? state.user : null;
}
