import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getSubmission } from "../api/api";
import { langIdToName } from "../data/langIdToName"; // Assuming this is the correct import path
import useUserStore from "../store/userStore";
import Editor from "@monaco-editor/react";

export default function Submission() {
  const [submission, setSubmission] = useState(null);
  const { submissionId } = useParams();
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.accessToken);

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        console.log("Fetching submission with ID:", submissionId);
        console.log("User ID:", user.id);
        const response = await getSubmission(submissionId, user.id);
        console.log("Submission fetched successfully:", response);
        setSubmission(response);
      } catch (error) {
        alert("Error fetching submission");
        console.error("Error fetching submission:", error);
      }
    };

    fetchSubmission();
  }, []);

  const getVerdictColor = (verdict) => {
    switch (verdict) {
      case "Accepted":
        return "bg-green-500";
      case "Wrong Answer":
        return "bg-red-500";
      case "Time Limit Exceeded":
        return "bg-red-500 text-black";
      case "Compilation Error":
        return "bg-gray-500";
      default:
        return "bg-blue-500";
    }
  };

  if (!submission) {
    return <p className="text-white">Loading submission details...</p>;
  }

  return (
    <div className="max-w-4xl mx-auto mt-6 sm:mt-10 p-3 sm:p-6 shadow-md rounded-lg border border-[#ffffff10] bg-[#212121] text-white w-full">
      <h1 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Submission Details</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
        <div>
          <span className="font-medium text-white/65">Submission ID:</span>{" "}
          {submission.id}
        </div>
        <div>
          <span className="font-medium text-white/65">User:</span>{" "}
          <Link
            to={`/user/${submission.user.username}`}
            className="text-blue-600 hover:underline"
          >
            {submission.user.username}
          </Link>
        </div>
        <div>
          <span className="font-medium text-white/65">Problem:</span>{" "}
          <Link
            to={`/problem/${submission.problem.id}`}
            className="text-blue-600 hover:underline"
          >
            {submission.problem.title} ({submission.problem.difficulty})
          </Link>
        </div>
        <div>
          <span className="font-medium text-white/65">Contest:</span>{" "}
          {submission.contest ? (
            <Link
              to={`/contests/${submission.contest.id}`}
              className="text-blue-600 hover:underline"
            >
              {submission.contest.id}
            </Link>
          ) : (
            <span className="italic text-gray-500">None</span>
          )}
        </div>
        <div>
          <span className="font-medium text-white/65">Memory Usage:</span>{" "}
          {submission.memoryUsage
            ? `${(submission.memoryUsage / 1024).toFixed(2)} MB`
            : "N/A"}
        </div>
        <div>
          <span className="font-medium text-white/65">Execution Time:</span>{" "}
          {submission.executionTime !== undefined &&
          submission.executionTime !== null
            ? `${Number(submission.executionTime).toFixed(2)} s`
            : "N/A"}
        </div>
        <div className="sm:col-span-2">
          <span className="font-medium text-white/65">Submitted At:</span>{" "}
          {new Date(submission.createdAt).toLocaleString()}
        </div>
        <div className="sm:col-span-2">
          <span className="font-medium text-white/65">Verdict:</span>{" "}
          <span
            className={`inline-block px-3 py-1 rounded-full text-white font-medium ${getVerdictColor(
              submission.verdict
            )}`}
          >
            {submission.verdict}
          </span>
        </div>
      </div>

      <div className="mt-4 sm:mt-6">
        <h3 className="text-base sm:text-lg font-semibold mb-2">Code:</h3>
        <div className="w-full overflow-x-auto rounded-md border border-[#ffffff10] bg-[#181818]">
          <Editor
            height="300px"
            language={langIdToName[submission.language]}
            value={submission.code || "// No code submitted"}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              wordWrap: "on",
              fontSize: 13,
              scrollBeyondLastLine: false,
            }}
          />
        </div>
      </div>
    </div>
  );
}
