import rehypeHighlight from "rehype-highlight";
import DifficultyTag from "./DifficultyTag";
import ReactMarkdown from "react-markdown";

const ProblemDescription = ({ data }) => {
  console.log("Problem Data:", data);
  return (
    <div className="problem-description">
      <h1 className="text-3xl font-semibold">{data.title}</h1>
      <div className="mt-1 flex gap-2">
        <DifficultyTag tag={data.difficulty} />
        <div>
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
