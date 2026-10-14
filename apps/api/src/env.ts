import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Not 5000: macOS keeps that port for AirPlay
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  ACCESS_TOKEN_SECRET: z.string().min(32, "use at least 32 random characters"),
  // The web app's origin, e.g. https://codegotlatent.com — the only origin allowed by CORS
  CLIENT_ORIGIN: z.url(),
  // OAuth client ID from Google Cloud Console; the web app uses the same one
  GOOGLE_CLIENT_ID: z.string().min(1),
  // go-judge sandbox (infra/docker-compose.yml, service "judge")
  JUDGE_URL: z.url().default("http://localhost:5050"),
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
