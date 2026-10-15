import { z } from "zod";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    // Not 5000: macOS keeps that port for AirPlay
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1),
    ACCESS_TOKEN_SECRET: z.string().min(32, "use at least 32 random characters"),
    // The web app's origin, e.g. https://codegotlatent.com — the only origin allowed by CORS.
    // Compared exactly with the browser's Origin header, so a stray trailing slash is dropped.
    CLIENT_ORIGIN: z
      .url()
      .refine((value) => {
        if (!URL.canParse(value)) return true; // reported by .url()
        const url = new URL(value);
        return url.pathname === "/" && !url.search && !url.hash;
      }, "must be an origin like https://codegotlatent.com, with no path")
      .transform((value) => new URL(value).origin),
    // OAuth client ID from Google Cloud Console; the web app uses the same one
    GOOGLE_CLIENT_ID: z.string().endsWith(".apps.googleusercontent.com", "expected a Google OAuth client ID (….apps.googleusercontent.com)"),
    // go-judge sandbox (infra/docker-compose.yml, service "judge")
    JUDGE_URL: z.url().default("http://localhost:5050"),
    // Bearer token the sandbox requires (its ES_AUTH_TOKEN); unset for a local sandbox
    JUDGE_TOKEN: z.string().optional(),
    // A header carrying the visitor's IP, set by the proxy in front of us (cf-connecting-ip
    // behind Cloudflare). Only safe when the API can't be reached except through that proxy.
    CLIENT_IP_HEADER: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;
    // Development values that would otherwise boot fine and fail in confusing ways
    const origin = new URL(env.CLIENT_ORIGIN);
    if (origin.protocol !== "https:" || LOCAL_HOSTS.has(origin.hostname)) {
      ctx.addIssue({ code: "custom", path: ["CLIENT_ORIGIN"], message: "must be the site's public https origin in production" });
    }
    if (!env.JUDGE_TOKEN || env.JUDGE_TOKEN.length < 32) {
      ctx.addIssue({ code: "custom", path: ["JUDGE_TOKEN"], message: "required in production: at least 32 random characters, matching the judge server" });
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Fails fast at boot with every missing or malformed variable listed. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
