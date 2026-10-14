import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/** Content-addressed file storage: every blob is stored under its SHA-256. */
export interface BlobStore {
  /** Stores data under its hash. Storing a blob that already exists is a no-op. */
  put(hash: string, data: Buffer): Promise<void>;
  /** Reads a blob, verifying it still matches its hash. */
  get(hash: string): Promise<Buffer>;
}

const SHA256_HEX = /^[0-9a-f]{64}$/;
const sha256 = (data: Buffer) => createHash("sha256").update(data).digest("hex");

/** Blobs on local disk, for development and single-machine deployments. */
export class FsBlobStore implements BlobStore {
  readonly #root: string;

  constructor(root: string) {
    this.#root = root;
  }

  #pathFor(hash: string): string {
    if (!SHA256_HEX.test(hash)) throw new Error(`Not a SHA-256 hash: ${hash}`);
    return join(this.#root, hash.slice(0, 2), hash);
  }

  async put(hash: string, data: Buffer): Promise<void> {
    if (sha256(data) !== hash) throw new Error(`Content doesn't match hash ${hash}`);
    const path = this.#pathFor(hash);
    if (await stat(path).then(() => true, () => false)) return;

    await mkdir(dirname(path), { recursive: true });
    // Write then rename, so a reader never sees a half-written blob
    const temporary = `${path}.${randomUUID()}.tmp`;
    await writeFile(temporary, data);
    await rename(temporary, path);
  }

  async get(hash: string): Promise<Buffer> {
    const data = await readFile(this.#pathFor(hash));
    if (sha256(data) !== hash) throw new Error(`Blob ${hash} is corrupt`);
    return data;
  }
}
