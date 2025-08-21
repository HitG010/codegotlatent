import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ContestDescription({ description }) {
  if (!description) return null;
  return (
    <article
      className="prose prose-lg max-w-none prose-invert
        prose-headings:text-gray-100
        prose-p:text-gray-300
        prose-strong:text-white
        prose-a:text-blue-400 hover:prose-a:text-blue-300
        prose-blockquote:border-gray-600
        prose-blockquote:text-gray-300
        prose-code:text-gray-200
        prose-pre:p-0 prose-pre:bg-transparent text-base px-1
        !prose-h1:m-0 !prose-h1:p-0
        !prose-h2:m-0 !prose-h2:p-0
        !prose-h3:m-0 !prose-h3:p-0
        !prose-h4:m-0 !prose-h4:p-0
        !prose-h5:m-0 !prose-h5:p-0
        !prose-h6:m-0 !prose-h6:p-0
        !prose-blockquote:m-0 !prose-blockquote:p-0
        !prose-li:m-0 !prose-li:p-0
        !prose-p:m-0 !prose-p:p-0"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
              <SyntaxHighlighter
                style={dracula}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            ) : (
              <code className="bg-black/20 border border-white/10 px-1 py-0.5 rounded" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {description}
      </ReactMarkdown>
    </article>
  );
}
