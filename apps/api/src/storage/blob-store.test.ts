import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FsBlobStore } from "./blob-store.js";

const sha256 = (data: Buffer) => createHash("sha256").update(data).digest("hex");
let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "cgl-blobs-"));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("FsBlobStore", () => {
  it("round-trips content under its hash", async () => {
    const store = new FsBlobStore(root);
    const data = Buffer.from("4 1\n1 1\n");
    await store.put(sha256(data), data);
    await store.put(sha256(data), data); // idempotent
    expect((await store.get(sha256(data))).equals(data)).toBe(true);
  });

  it("refuses content that doesn't match the hash, and names that aren't hashes", async () => {
    const store = new FsBlobStore(root);
    await expect(store.put(sha256(Buffer.from("a")), Buffer.from("b"))).rejects.toThrow(/doesn't match/);
    await expect(store.get("../../etc/passwd")).rejects.toThrow(/Not a SHA-256/);
  });

  it("detects a blob changed on disk", async () => {
    const store = new FsBlobStore(root);
    const data = Buffer.from("42\n");
    const hash = sha256(data);
    await store.put(hash, data);
    await writeFile(join(root, hash.slice(0, 2), hash), "43\n");
    await expect(store.get(hash)).rejects.toThrow(/corrupt/);
  });
});
