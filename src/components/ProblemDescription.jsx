import rehypeHighlight from "rehype-highlight";
import DifficultyTag from "./DifficultyTag";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check } from "lucide-react";

const ProblemDescription = ({ data }) => {
  // console.log("Problem Data:", data);
  return (
    <div className="problem-description">
      <div className="flex justify-between items-center my-3 mt-4 px-1">
        <h1 className="text-3xl font-semibold">{data.title}</h1>
        <p className="text-sm text-gray-400">
          <span className="text-white/65">
            {data.isSolved === true ? (
              <p className="flex gap-2 items-center">
                <Check className="text-green-500 h-4 w-4" /> Solved
              </p>
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
            <p
              key={tag.id}
              className="px-3 py-1 rounded-full text-sm font-medium bg-white/15 text-white/50"
            >
              {tag.tag}
            </p>
          ))}
        </div>
      </div>
      {/* <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
        {data.description}
      </ReactMarkdown> */}
      <article
        className="prose prose-lg max-w-none prose-invert
        prose-headings:text-gray-100
        prose-p:text-gray-300
        prose-strong:text-white
        prose-a:text-blue-400 hover:prose-a:text-blue-300
        prose-blockquote:border-gray-600
        prose-blockquote:text-gray-300
        prose-code:text-gray-200
        prose-pre:p-0 prose-pre:bg-transparent text-base px-1"
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
                <code
                  className="bg-black/20 border border-white/10 px-1 py-0.5 rounded"
                  {...props}
                >
                  {children}
                </code>
              );
            },
          }}
        >
          {data.description}
        </ReactMarkdown>
      </article>
      {/* <p>Max Time Limit: {data.max_time_limit} seconds</p>
      <p>Max Memory Limit: {data.max_memory_limit / 1024} MB</p> */}
    </div>
  );
};

export default ProblemDescription;
