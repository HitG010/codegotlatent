import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./render.js";

describe("renderMarkdown", () => {
  it("typesets inline and display math with KaTeX", async () => {
    const html = await renderMarkdown("Let $1 \\le N$.\n\n$$\n\\sum_i a_i\n$$\n");
    expect(html).toContain('class="katex"');
    expect(html).toContain('class="katex-display"');
    expect(html).not.toContain("$");
  });

  it("supports GitHub-flavoured tables", async () => {
    const html = await renderMarkdown("| a | b |\n| - | - |\n| 1 | 2 |\n");
    expect(html).toContain("<table>");
  });

  it("strips scripts, event handlers and javascript: links", async () => {
    const html = await renderMarkdown(
      '<script>alert(1)</script><img src=x onerror="alert(1)">[x](javascript:alert(1))',
    );
    expect(html).not.toMatch(/<script|onerror|javascript:/i);
  });
});
