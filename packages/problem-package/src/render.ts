import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

// Keep the classes remark-math puts on math nodes so KaTeX can find them
const schema: SanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [["className", /^language-./, "math-inline", "math-display"]],
  },
};

// Sanitising runs before KaTeX, so author HTML is cleaned and KaTeX's own
// markup is left intact
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype)
  .use(rehypeSanitize, schema)
  .use(rehypeKatex)
  .use(rehypeStringify);

/**
 * Renders a statement or editorial to HTML once, at publish time, so problem
 * pages ship no Markdown or KaTeX JavaScript — only KaTeX's stylesheet.
 */
export async function renderMarkdown(markdown: string): Promise<string> {
  return String(await processor.process(markdown));
}
