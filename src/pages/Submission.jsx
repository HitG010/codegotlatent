import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getSubmission } from "../api/api";
import { langIdToName } from "../data/langIdToName"; // Assuming this is the correct import path
import useUserStore from "../store/userStore";

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
        return "bg-yellow-500 text-black";
      case "Compilation Error":
        return "bg-gray-500";
      default:
        return "bg-blue-500";
    }
  };

  if (!submission) {
    return <p className="text-gray-700">Loading submission details...</p>;
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white shadow-md rounded-lg border border-gray-200">
      <h1 className="text-2xl font-bold mb-6">Submission Details</h1>

      <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
        <div>
          <span className="font-semibold">Submission ID:</span> {submission.id}
        </div>
        <div>
          <span className="font-semibold">User:</span>{" "}
          <Link
            to={`/user/${submission.user.id}`}
            className="text-blue-600 hover:underline"
          >
            {submission.user.username}
          </Link>
        </div>
        <div>
          <span className="font-semibold">Problem:</span>{" "}
          <Link
            to={`/problems/${submission.problem.id}`}
            className="text-blue-600 hover:underline"
          >
            {submission.problem.title} ({submission.problem.difficulty})
          </Link>
        </div>
        <div>
          <span className="font-semibold">Contest:</span>{" "}
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
          <span className="font-semibold">Memory Usage:</span>{" "}
          {submission.memoryUsage ?? "N/A"} MB
        </div>
        <div>
          <span className="font-semibold">Execution Time:</span>{" "}
          {submission.executionTime ?? "N/A"} ms
        </div>
        <div className="col-span-2">
          <span className="font-semibold">Submitted At:</span>{" "}
          {new Date(submission.createdAt).toLocaleString()}
        </div>
        <div className="col-span-2">
          <span className="font-semibold">Verdict:</span>{" "}
          <span
            className={`inline-block px-3 py-1 rounded-full text-white font-medium ${getVerdictColor(
              submission.verdict
            )}`}
          >
            {submission.verdict}
          </span>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Code:</h3>
        <pre className="bg-gray-100 text-black rounded-md p-4 overflow-auto text-sm whitespace-pre-wrap font-mono border border-gray-300">
          {submission.code || "// No code submitted"}
        </pre>
      </div>
    </div>
  );
}
