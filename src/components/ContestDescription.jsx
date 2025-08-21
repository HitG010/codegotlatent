import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ContestDescription({ description }) {
  if (!description) return null;
  return (
    <div className="prose prose-invert max-w-none text-white/65 text-sm lg:text-sm break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
    </div>
  );
}
