import rehypeHighlight from "rehype-highlight";
import DifficultyTag from "./DifficultyTag";
import ReactMarkdown from "react-markdown";
import { Check } from "lucide-react";

const ProblemDescription = ({ data }) => {
  console.log("Problem Data:", data);
  return (
    <div className="problem-description">
      <div className="flex justify-between items-center mb-4">
      <h1 className="text-3xl font-semibold">{data.title}</h1>
      <p className="text-sm text-gray-400">
        <span className="text-white/65">{data.isSolved === true ? <p className="flex gap-2 items-center"><Check className="text-green-500 h-4 w-4"/> Solved</p> : (data.isSolved === false ? "Attempted" : "")}</span>
      </p>
      </div>
      <div className="mt-1 flex gap-2 w-full items-center">
        <DifficultyTag tag={data.difficulty} />
        <div className="flex gap-2 flex-wrap">
          {data.tags.map((tag) => (
            <p
              key={tag.id}
              className="px-3 py-1 rounded-full text-sm font-medium bg-white/15 text-white/50"
            >
              {tag.tag}
            </p>
          ))}
        </div>
      </div>
      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
        {data.description}
      </ReactMarkdown>
      <p>Max Time Limit: {data.max_time_limit} seconds</p>
      <p>Max Memory Limit: {data.max_memory_limit / 1024} MB</p>
    </div>
  );
};

export default ProblemDescription;
