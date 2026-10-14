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

export class GoJudge {
  readonly #baseUrl: string;

  constructor(baseUrl: string) {
    this.#baseUrl = baseUrl.replace(/\/$/, "");
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
    const res = await fetch(`${this.#baseUrl}/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Sandbox error ${res.status}: ${(await res.text()).slice(0, 200)}`);
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

  /** Frees a cached file (a compiled program). Failures are harmless: go-judge expires them anyway. */
  async release(fileId: string): Promise<void> {
    await fetch(`${this.#baseUrl}/file/${encodeURIComponent(fileId)}`, { method: "DELETE" }).catch(() => undefined);
  }
}
