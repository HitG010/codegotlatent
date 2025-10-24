import rehypeHighlight from "rehype-highlight";
import DifficultyTag from "./DifficultyTag";
import React, { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

const ProblemDescription = ({ data }) => {
  // Helper: try to parse description which may be a JSON-stringified array
  const parseSlides = (desc) => {
    desc = desc.replace(/\n/g, "\\n");
    // console.log("Raw description:", desc);
    // console.log(desc[19], desc[20], desc[21]);
    
    return JSON.parse(desc);

  };

  const slides = useMemo(() => parseSlides(data?.description), [data]);
  const [index, setIndex] = useState(0);

  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(slides.length - 1, i + 1));

  // Code block renderer reused for slides
  const CodeRenderer = ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || "");
    return !inline && match ? (
      <SyntaxHighlighter style={dracula} language={match[1]} PreTag="div" {...props}>
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    ) : (
      <code className="bg-black/20 border border-white/10 px-1 py-0.5 rounded" {...props}>
        {children}
      </code>
    );
  };

  return (
    <div className="problem-description">
      <div className="flex justify-between items-center my-3 mt-4 px-1">
        <h1 className="text-3xl font-semibold">{data.title}</h1>
        <p className="text-sm text-gray-400">
          <span className="text-white/65">
            {data.isSolved === true ? (
              <div className="flex gap-2 items-center">
                <Check className="text-green-500 h-4 w-4" /> Solved
              </div>
            ) : data.isSolved === false ? (
              "Attempted"
            ) : (
              ""
            )}
          </span>
        </p>
      </div>

      <div className="m-2 flex gap-2 w-full items-center">
        <DifficultyTag tag={data.difficulty} />
        <div className="flex gap-2 flex-wrap">
          {data.tags?.map((tag) => (
            <p key={tag.id} className="px-3 py-1 rounded-full text-sm font-medium bg-white/15 text-white/50">
              {tag.tag}
            </p>
          ))}
        </div>
      </div>

      <article className="prose prose-lg max-w-none prose-invert prose-headings:text-gray-100 prose-p:text-gray-300 prose-strong:text-white prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-blockquote:border-gray-600 prose-blockquote:text-gray-300 prose-code:text-gray-200 prose-pre:p-0 prose-pre:bg-transparent text-base px-1">
        {/* Carousel controls when slides > 1 */}
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeRenderer }}>
          {slides[index] ?? ""}
        </ReactMarkdown>
        {slides.length > 1 && (
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-2">
              <button onClick={prev} disabled={index === 0} className="p-2 rounded-md bg-white/6 hover:bg-white/10 disabled:opacity-40 flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button onClick={next} disabled={index === slides.length - 1} className="p-2 rounded-md bg-white/6 hover:bg-white/10 disabled:opacity-40 flex items-center gap-1">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm text-white/60">{index + 1} / {slides.length}</div>
          </div>
        )}

      </article>
    </div>
  );
};

export default ProblemDescription;
