import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * A real build needs a real API: without VITE_API_URL the app silently runs on
 * sample data, which is only right for `build:prototype`. Returns the API's origin.
 */
function checkReleaseEnv(env: Record<string, string>): string {
  const problems: string[] = [];
  const api = env["VITE_API_URL"];
  let origin = "";
  if (!api || !URL.canParse(api)) {
    problems.push("VITE_API_URL must be the API's URL, e.g. https://api.codegotlatent.com");
  } else {
    const url = new URL(api);
    if (url.protocol !== "https:" && !LOCAL_HOSTS.has(url.hostname)) problems.push("VITE_API_URL must use https");
    if (api.endsWith("/")) problems.push("VITE_API_URL must not end with a slash");
    origin = url.origin;
  }
  if (!env["VITE_GOOGLE_CLIENT_ID"]?.endsWith(".apps.googleusercontent.com")) {
    problems.push("VITE_GOOGLE_CLIENT_ID must be the Google OAuth client ID (….apps.googleusercontent.com)");
  }
  if (problems.length) {
    throw new Error(`Can't build for release:\n  ${problems.join("\n  ")}\n(build:prototype builds the sample-data version)`);
  }
  return origin;
}

/**
 * Security headers for Cloudflare Pages, written to dist/_headers. Google
 * sign-in is the only third party; its CSP needs are listed at
 * https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid#content_security_policy
 */
function pagesHeaders(apiOrigin: string): Plugin {
  const csp = [
    "default-src 'self'",
    "script-src 'self' https://accounts.google.com/gsi/client",
    // React style props, CodeMirror's injected styles, and Google's button
    "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
    "font-src 'self'",
    "img-src 'self' data:",
    `connect-src 'self' ${apiOrigin} https://accounts.google.com/gsi/`,
    "frame-src https://accounts.google.com/gsi/",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  const headers = `/*
  Content-Security-Policy: ${csp}
  Cross-Origin-Opener-Policy: same-origin-allow-popups
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff

/assets/*
  Cache-Control: public, max-age=31536000, immutable
`;
  return {
    name: "cgl-pages-headers",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "_headers", source: headers });
    },
  };
}

export default defineConfig(({ command, mode }) => {
  // The prototype is published as a standalone page: relative asset URLs, and
  // fonts inlined because the host only serves fonts from data: URIs
  const prototype = mode === "prototype";
  const release = command === "build" && !prototype;
  const apiOrigin = release ? checkReleaseEnv(loadEnv(mode, process.cwd(), "VITE_")) : "";
  return {
    plugins: [react(), tailwindcss(), ...(release ? [pagesHeaders(apiOrigin)] : [])],
    base: prototype ? "./" : "/",
    build: prototype
      ? { assetsInlineLimit: (file: string) => file.endsWith(".woff2") }
      : // Fonts stay files, small ones included: the CSP's font-src doesn't allow data: URIs
        { assetsInlineLimit: (file: string) => (/\.(woff2?|ttf)$/.test(file) ? false : undefined) },
  };
});
