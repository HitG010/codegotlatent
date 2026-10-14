import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { pino } from "pino";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { createDb, type Db } from "../db.js";
import { meRouter } from "../me/routes.js";
import type { GoogleIdentity } from "./google.js";
import { authRouter } from "./routes.js";

const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];
const SECRET = "test-secret-that-is-at-least-32-chars!";
const ORIGIN = "http://localhost:5173";

// Stands in for Google: each "token" maps to the account it would verify as
const GOOGLE_ACCOUNTS: Record<string, GoogleIdentity> = {
  "token-riya": { googleId: "g-riya", email: "riya.m@example.com", name: "Riya M" },
  "token-arjun": { googleId: "g-arjun", email: "arjun@example.com", name: null },
};

describe.skipIf(!TEST_DATABASE_URL)("auth and /me (database)", () => {
  let db: Db;
  let server: Server;
  let base: string;

  beforeAll(async () => {
    db = createDb(TEST_DATABASE_URL!);
    const app = createApp({
      clientOrigin: ORIGIN,
      logger: pino({ level: "silent" }),
      pingDb: async () => undefined,
      routers: [
        authRouter({
          db,
          verifyGoogle: async (token) => {
            const account = GOOGLE_ACCOUNTS[token];
            if (!account) throw new Error("invalid token");
            return account;
          },
          accessTokenSecret: SECRET,
          clientOrigin: ORIGIN,
          secureCookies: false,
        }),
        meRouter({ db, accessTokenSecret: SECRET }),
      ],
    });
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    server.close();
    await db.$disconnect();
  });

  beforeEach(async () => {
    await db.$executeRawUnsafe('TRUNCATE "User" CASCADE');
  });

  const post = (path: string, { body, cookie, origin = ORIGIN }: { body?: unknown; cookie?: string; origin?: string | null } = {}) =>
    fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(origin ? { origin } : {}),
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body ?? {}),
    });

  /** The session cookie as a browser would send it back. */
  const cookieFrom = (res: Response) => res.headers.get("set-cookie")?.split(";")[0] ?? "";

  async function signIn(token = "token-riya") {
    const res = await post("/auth/google", { body: { credential: token } });
    expect(res.status).toBe(200);
    return { res, body: (await res.json()) as { accessToken: string; user: { id: string; handle: string; handleConfirmed: boolean } }, cookie: cookieFrom(res) };
  }

  it("signs a new Google account in with a placeholder handle and a session cookie", async () => {
    const { res, body } = await signIn();
    expect(body.user).toMatchObject({ name: "Riya M", role: "USER", handleConfirmed: false });
    expect(body.user.handle).toMatch(/^riya_m_\d{4}$/);

    const setCookie = res.headers.get("set-cookie")!;
    expect(setCookie).toMatch(/^cgl_session=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/Path=\/auth/);
    expect(setCookie).toMatch(/SameSite=Lax/i);

    // The database keeps only a hash of the token
    const raw = setCookie.split(";")[0]!.split("=")[1]!;
    const [session] = await db.session.findMany();
    expect(session!.tokenHash).not.toBe(raw);
    expect(session!.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns the same account on the next sign-in, with a session per device", async () => {
    const first = await signIn();
    const second = await signIn();
    expect(second.body.user.id).toBe(first.body.user.id);
    expect(await db.session.count({ where: { userId: first.body.user.id } })).toBe(2);
  });

  it("links a Google account to an existing account with the same email", async () => {
    const existing = await db.user.create({ data: { email: "arjun@example.com", username: "arjun" } });
    const { body } = await signIn("token-arjun");
    expect(body.user.id).toBe(existing.id);
    expect((await db.user.findUniqueOrThrow({ where: { id: existing.id } })).googleId).toBe("g-arjun");
  });

  it("refuses tokens Google doesn't accept", async () => {
    const res = await post("/auth/google", { body: { credential: "forged" } });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: { code: "google_rejected" } });
  });

  it("refreshes a session from its cookie, and the new access token works", async () => {
    const { cookie } = await signIn();
    const refreshed = await post("/auth/refresh", { cookie });
    expect(refreshed.status).toBe(200);
    const { accessToken } = (await refreshed.json()) as { accessToken: string };

    const me = await fetch(`${base}/me`, { headers: { authorization: `Bearer ${accessToken}` } });
    expect(me.status).toBe(200);
    expect(await me.json()).toMatchObject({ user: { name: "Riya M" } });
  });

  it("signs out: the session is revoked and the cookie cleared", async () => {
    const { cookie } = await signIn();
    const out = await post("/auth/logout", { cookie });
    expect(out.status).toBe(204);
    expect(out.headers.get("set-cookie")).toMatch(/cgl_session=;/);
    expect((await post("/auth/refresh", { cookie })).status).toBe(401);
  });

  it("won't refresh an expired session or one without a cookie", async () => {
    const { cookie } = await signIn();
    await db.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await post("/auth/refresh", { cookie })).status).toBe(401);
    expect((await post("/auth/refresh")).status).toBe(401);
  });

  it("blocks cookie endpoints called from other sites", async () => {
    const { cookie } = await signIn();
    expect((await post("/auth/refresh", { cookie, origin: "https://evil.example" })).status).toBe(403);
    expect((await post("/auth/logout", { cookie, origin: null })).status).toBe(403);
    expect((await post("/auth/google", { body: { credential: "token-riya" }, origin: "https://evil.example" })).status).toBe(403);
  });

  describe("PATCH /me/handle", () => {
    const patch = (token: string, handle: string) =>
      fetch(`${base}/me/handle`, {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ handle }),
      });

    it("sets and confirms a valid handle, lowercased", async () => {
      const { body } = await signIn();
      const res = await patch(body.accessToken, "Riya_Codes");
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ user: { handle: "riya_codes", handleConfirmed: true } });
    });

    it("rejects invalid, reserved and taken handles", async () => {
      const riya = await signIn();
      const arjun = await signIn("token-arjun");
      await patch(riya.body.accessToken, "riya");

      expect((await patch(arjun.body.accessToken, "x")).status).toBe(400);
      expect((await patch(arjun.body.accessToken, "admin")).status).toBe(400);
      const taken = await patch(arjun.body.accessToken, "RIYA");
      expect(taken.status).toBe(409);
      expect(await taken.json()).toMatchObject({ error: { code: "handle_taken" } });
    });

    it("needs a signed-in user", async () => {
      expect((await fetch(`${base}/me`)).status).toBe(401);
    });
  });
});
