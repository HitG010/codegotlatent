import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { pino } from "pino";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, type AppDeps } from "./app.js";
import { requireAdmin, requireUser, signAccessToken } from "./http/auth.js";

const SECRET = "test-secret-that-is-at-least-32-chars!";
let server: Server | undefined;

async function start(overrides: Partial<AppDeps> = {}) {
  const probe = Router();
  probe.get("/probe/me", requireUser(SECRET), (req, res) => res.json(req.user));
  probe.get("/probe/admin", requireUser(SECRET), requireAdmin, (_req, res) => res.json({ ok: true }));

  const app = createApp({
    clientOrigin: "http://localhost:5173",
    logger: pino({ level: "silent" }),
    pingDb: async () => undefined,
    routers: [probe],
    ...overrides,
  });
  server = app.listen(0);
  await new Promise((resolve) => server!.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  return (path: string, init?: RequestInit) => fetch(`http://127.0.0.1:${port}${path}`, init);
}

const bearer = (token: string) => ({ headers: { authorization: `Bearer ${token}` } });

afterEach(() => {
  server?.close();
  server = undefined;
});

describe("GET /health", () => {
  it("reports the database as up", async () => {
    const request = await start();
    const res = await request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, db: "up" });
  });

  it("returns 503 when the database is unreachable", async () => {
    const request = await start({ pingDb: () => Promise.reject(new Error("down")) });
    const res = await request("/health");
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, db: "down" });
  });
});

describe("requireUser", () => {
  it("takes identity from the signed token", async () => {
    const request = await start();
    const res = await request("/probe/me", bearer(signAccessToken({ id: "u1", role: "USER" }, SECRET)));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "u1", role: "USER" });
  });

  it("rejects missing, forged, expired and malformed tokens", async () => {
    const request = await start();
    const forged = signAccessToken({ id: "u1", role: "ADMIN" }, "some-other-secret-of-32-characters!!");
    const expired = jwt.sign({ role: "USER" }, SECRET, { subject: "u1", expiresIn: -10 });
    const noRole = jwt.sign({}, SECRET, { subject: "u1" });
    const unsigned = jwt.sign({ role: "ADMIN" }, "", { algorithm: "none", subject: "u1" });

    expect((await request("/probe/me")).status).toBe(401);
    for (const token of [forged, expired, noRole, unsigned]) {
      const res = await request("/probe/me", bearer(token));
      expect(res.status).toBe(401);
    }
  });
});

describe("requireAdmin", () => {
  it("lets admins through and turns everyone else away", async () => {
    const request = await start();
    const asAdmin = await request("/probe/admin", bearer(signAccessToken({ id: "a", role: "ADMIN" }, SECRET)));
    const asUser = await request("/probe/admin", bearer(signAccessToken({ id: "u", role: "USER" }, SECRET)));
    expect(asAdmin.status).toBe(200);
    expect(asUser.status).toBe(403);
    expect(await asUser.json()).toMatchObject({ error: { code: "forbidden" } });
  });
});

describe("error handling", () => {
  it("returns JSON 404s for unknown routes", async () => {
    const request = await start();
    const res = await request("/nope");
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: { code: "not_found" } });
  });

  it("rejects malformed JSON with a 400, not a 500", async () => {
    const request = await start();
    const res = await request("/probe/me", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    expect(res.status).toBe(400);
  });
});
