import { useEffect, useRef, useState } from "react";

// Google Identity Services, loaded on demand: https://developers.google.com/identity/gsi/web
interface GoogleIdentity {
  accounts: {
    id: {
      initialize(options: { client_id: string; callback: (response: { credential: string }) => void; ux_mode?: "popup" }): void;
      renderButton(parent: HTMLElement, options: Record<string, string | number>): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

const CLIENT_ID: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID || undefined;
let loading: Promise<GoogleIdentity> | null = null;

function loadGoogle(): Promise<GoogleIdentity> {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => (window.google ? resolve(window.google) : reject(new Error("Google sign-in didn't load")));
    script.onerror = () => {
      loading = null;
      reject(new Error("Google sign-in didn't load"));
    };
    document.head.append(script);
  });
  return loading;
}

/** Google's own sign-in button. Calls back with the ID token to send to our API. */
export function GoogleButton({ onCredential }: { onCredential: (credential: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  callback.current = onCredential;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadGoogle().then(
      (google) => {
        if (cancelled || !host.current) return;
        google.accounts.id.initialize({ client_id: CLIENT_ID, callback: (response) => callback.current(response.credential), ux_mode: "popup" });
        google.accounts.id.renderButton(host.current, { theme: "filled_black", size: "large", shape: "rectangular", text: "continue_with", width: 280 });
      },
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (!CLIENT_ID) return <p className="text-sm text-bad">Google sign-in isn't configured: set VITE_GOOGLE_CLIENT_ID.</p>;
  if (failed) return <p className="text-sm text-bad">Couldn't reach Google. Check your connection and reload the page.</p>;
  return <div ref={host} className="min-h-11" />;
}
