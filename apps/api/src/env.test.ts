import { describe, expect, it } from "vitest";
import { loadEnv } from "./env.js";

const DEV = {
  DATABASE_URL: "postgresql://cgl:cgl@localhost:5433/cgl",
  ACCESS_TOKEN_SECRET: "a".repeat(64),
  CLIENT_ORIGIN: "http://localhost:5173",
  GOOGLE_CLIENT_ID: "123-abc.apps.googleusercontent.com",
};
const PRODUCTION = { ...DEV, NODE_ENV: "production", CLIENT_ORIGIN: "https://codegotlatent.com", JUDGE_TOKEN: "b".repeat(64) };

describe("loadEnv", () => {
  it("accepts a development setup", () => {
    expect(loadEnv(DEV)).toMatchObject({ NODE_ENV: "development", CLIENT_ORIGIN: "http://localhost:5173", PORT: 4000 });
  });

  it("keeps CLIENT_ORIGIN an exact origin", () => {
    expect(loadEnv({ ...DEV, CLIENT_ORIGIN: "https://codegotlatent.com/" }).CLIENT_ORIGIN).toBe("https://codegotlatent.com");
    expect(() => loadEnv({ ...DEV, CLIENT_ORIGIN: "https://codegotlatent.com/app" })).toThrow(/CLIENT_ORIGIN/);
    expect(() => loadEnv({ ...DEV, CLIENT_ORIGIN: "not a url" })).toThrow(/CLIENT_ORIGIN/);
  });

  it("rejects a short secret and a malformed Google client ID", () => {
    expect(() => loadEnv({ ...DEV, ACCESS_TOKEN_SECRET: "secret" })).toThrow(/ACCESS_TOKEN_SECRET/);
    expect(() => loadEnv({ ...DEV, GOOGLE_CLIENT_ID: "GOCSPX-a-client-secret" })).toThrow(/GOOGLE_CLIENT_ID/);
  });

  it("accepts a production setup", () => {
    expect(loadEnv(PRODUCTION)).toMatchObject({ NODE_ENV: "production", CLIENT_ORIGIN: "https://codegotlatent.com" });
  });

  it("refuses development values in production", () => {
    expect(() => loadEnv({ ...PRODUCTION, CLIENT_ORIGIN: "http://localhost:5173" })).toThrow(/CLIENT_ORIGIN/);
    expect(() => loadEnv({ ...PRODUCTION, CLIENT_ORIGIN: "http://codegotlatent.com" })).toThrow(/CLIENT_ORIGIN/);
    expect(() => loadEnv({ ...PRODUCTION, JUDGE_TOKEN: undefined })).toThrow(/JUDGE_TOKEN/);
    expect(() => loadEnv({ ...PRODUCTION, JUDGE_TOKEN: "short" })).toThrow(/JUDGE_TOKEN/);
  });

  it("lists every problem at once", () => {
    expect(() => loadEnv({ NODE_ENV: "production", CLIENT_ORIGIN: "http://localhost:5173" })).toThrow(
      /DATABASE_URL[\s\S]*ACCESS_TOKEN_SECRET|ACCESS_TOKEN_SECRET[\s\S]*DATABASE_URL/,
    );
  });
});
