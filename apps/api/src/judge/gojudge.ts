// A thin client for go-judge's REST API: https://github.com/criyle/go-judge
// Times are in nanoseconds and sizes in bytes on the wire.

export type SandboxStatus =
  | "Accepted"
  | "Memory Limit Exceeded"
  | "Time Limit Exceeded"
  | "Output Limit Exceeded"
  | "File Error"
  | "Nonzero Exit Status"
  | "Signalled"
  | "Internal Error"
  | (string & {});

type CopyIn = Record<string, { content: string } | { fileId: string }>;

export interface SandboxCommand {
  args: string[];
  stdin: string;
  copyIn: CopyIn;
  cpuMs: number;
  memoryMb: number;
  procLimit: number;
  /** Upper bound on captured stdout. */
  stdoutMaxBytes: number;
  copyOutCached?: string[];
}

export interface SandboxResult {
  status: SandboxStatus;
  exitStatus: number;
  timeMs: number;
  memoryKb: number;
  stdout: string;
  stderr: string;
  fileIds: Record<string, string>;
}

const ENV = ["PATH=/usr/bin:/bin", "HOME=/w"];
const NS_PER_MS = 1_000_000;
// Covers a slow network and a busy sandbox on top of the program's own wall clock
const REQUEST_SLACK_MS = 30_000;

/**
 * The sandbox couldn't be reached or couldn't take the job: down, restarting,
 * overloaded, or misconfigured. Nothing to do with the code being judged, so
 * the submission should wait for the sandbox, not fail.
 */
export class SandboxUnavailable extends Error {
  override name = "SandboxUnavailable";
}

/** What judging needs from a sandbox; tests substitute their own. */
export type Sandbox = Pick<GoJudge, "run" | "release" | "ping">;

export class GoJudge {
  readonly #baseUrl: string;
  readonly #headers: Record<string, string>;

  /** `token` must match the sandbox's ES_AUTH_TOKEN, when it has one. */
  constructor(baseUrl: string, { token }: { token?: string | undefined } = {}) {
    this.#baseUrl = baseUrl.replace(/\/$/, "");
    this.#headers = token ? { authorization: `Bearer ${token}` } : {};
  }

  async #fetch(path: string, init: RequestInit & { timeoutMs: number }): Promise<Response> {
    let res: Response;
    try {
      res = await fetch(`${this.#baseUrl}${path}`, {
        ...init,
        headers: { ...this.#headers, ...init.headers },
        signal: AbortSignal.timeout(init.timeoutMs),
      });
    } catch (error) {
      throw new SandboxUnavailable(`Sandbox unreachable: ${(error as Error).message}`, { cause: error });
    }
    if (!res.ok) {
      const message = `Sandbox error ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`;
      // A 4xx other than auth means we sent a bad request, which retrying won't fix
      const ours = res.status >= 400 && res.status < 500 && ![401, 403, 408, 429].includes(res.status);
      throw ours ? new Error(message) : new SandboxUnavailable(message);
    }
    return res;
  }

  async run(command: SandboxCommand): Promise<SandboxResult> {
    const body = {
      cmd: [
        {
          args: command.args,
          env: ENV,
          files: [
            { content: command.stdin },
            { name: "stdout", max: command.stdoutMaxBytes },
            { name: "stderr", max: 16 * 1024 },
          ],
          cpuLimit: command.cpuMs * NS_PER_MS,
          // Wall clock gets headroom so a program blocked on I/O still ends
          clockLimit: command.cpuMs * 3 * NS_PER_MS,
          memoryLimit: command.memoryMb * 1024 * 1024,
          procLimit: command.procLimit,
          copyIn: command.copyIn,
          copyOutCached: command.copyOutCached ?? [],
        },
      ],
    };
    const res = await this.#fetch("/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      timeoutMs: body.cmd[0]!.clockLimit / NS_PER_MS + REQUEST_SLACK_MS,
    });
    const [result] = (await res.json()) as Array<{
      status: SandboxStatus;
      exitStatus: number;
      time: number;
      memory: number;
      files?: { stdout?: string; stderr?: string };
      fileIds?: Record<string, string>;
    }>;
    if (!result) throw new Error("Sandbox returned no result");
    return {
      status: result.status,
      exitStatus: result.exitStatus,
      timeMs: Math.round(result.time / NS_PER_MS),
      memoryKb: Math.round(result.memory / 1024),
      stdout: result.files?.stdout ?? "",
      stderr: result.files?.stderr ?? "",
      fileIds: result.fileIds ?? {},
    };
  }

  /** Frees a cached file (a compiled program). Failures are harmless: the deployed sandbox expires them (ES_FILE_TIMEOUT). */
  async release(fileId: string): Promise<void> {
    await this.#fetch(`/file/${encodeURIComponent(fileId)}`, { method: "DELETE", timeoutMs: 5_000 }).catch(() => undefined);
  }

  /** True when the sandbox answers and accepts our token. */
  async ping(): Promise<boolean> {
    // Lists cached files: cheap, and unlike /version it checks the token
    return this.#fetch("/file", { timeoutMs: 5_000 }).then(
      () => true,
      () => false,
    );
  }
}
