// @ts-check
// Bundles the API, the judging worker and the CLIs into dist/ for production.
// The workspace packages ship TypeScript source, so they (and their own
// dependencies) are bundled in; this package's dependencies stay external and
// load from node_modules, as they do in development.
import { readFile, rm } from "node:fs/promises";
import { build } from "esbuild";

const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const external = Object.keys(pkg.dependencies).filter((name) => !name.startsWith("@cgl/"));

await rm("dist", { recursive: true, force: true });
await build({
  entryPoints: {
    api: "src/main.ts",
    worker: "src/worker.ts",
    "import-problems": "src/cli/import-problems.ts",
    "create-contest": "src/cli/create-contest.ts",
  },
  outdir: "dist",
  bundle: true,
  splitting: true,
  format: "esm",
  platform: "node",
  target: "node22",
  external,
  // Run with --enable-source-maps (the Docker image does) for stack traces into the TypeScript
  sourcemap: true,
  logLevel: "warning",
});
console.log(`built dist/ (external: ${external.join(", ")})`);
