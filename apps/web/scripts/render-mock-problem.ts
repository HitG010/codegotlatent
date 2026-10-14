// Renders the example problem through the real publish pipeline, so the
// prototype shows exactly what problem pages will receive from the API.
//   pnpm --filter @cgl/web mock:problem
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadPackage, renderMarkdown } from "@cgl/problem-package";

const fixture = join(import.meta.dirname, "../../../packages/problem-package/fixtures/self-aware");
const pkg = await loadPackage(fixture);

const problem = {
  slug: pkg.slug,
  title: pkg.title,
  difficulty: pkg.difficulty,
  tags: pkg.tags,
  timeLimitMs: pkg.timeLimitMs,
  memoryLimitMb: pkg.memoryLimitMb,
  statementHtml: await renderMarkdown(pkg.statementMarkdown),
  editorialHtml: pkg.editorialMarkdown ? await renderMarkdown(pkg.editorialMarkdown) : null,
  samples: pkg.tests
    .filter((t) => t.isSample)
    .map((t) => ({ input: t.input.toString("utf8"), output: t.answer.toString("utf8") })),
  secretTestCount: pkg.tests.filter((t) => !t.isSample).length,
};

await writeFile(join(import.meta.dirname, "../src/mock/self-aware.json"), `${JSON.stringify(problem, null, 2)}\n`);
console.log("wrote src/mock/self-aware.json");
