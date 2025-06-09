import React, { useState, useEffect } from "react";
import { getUserProblemSubmission } from "../api/api";
import { langIdToName } from "../data/langIdToName"; // Assuming this is the correct import path
import { Link } from "react-router-dom"; // Assuming you're using react-router for navigation

const ProblemSubmissions = ({ problemId, userId }) => {
  // console.log("ProblemSubmissions component rendered with:", {
  //   problemId,
  //   userId,
  // });
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const response = await getUserProblemSubmission(problemId, userId);
        setSubmissions(response);
      } catch (error) {
        console.error("Error fetching submissions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [problemId, userId]);

  if (loading) {
    return <div className="text-white">Loading submissions...</div>;
  }
  if (submissions.length === 0) {
    return (
      <div className="text-white">No submissions found for this problem.</div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-white mb-4">Submissions</h2>
      <table className="min-w-full bg-gray-700 text-white">
        <thead>
          <tr>
            <th className="px-6 py-3 text-left"></th>
            <th className="px-6 py-3 text-left">Status</th>
            <th className="px-6 py-3 text-left">Language</th>
            <th className="px-6 py-3 text-left">Time</th>
            <th className="px-6 py-3 text-left">Memory</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((submission, index) => (
            <tr
              key={submission.id}
              className="border-b border-gray-600 cursor-pointer hover:bg-gray-600"
              onClick={() =>
                (window.location.href = `/submission/${submission.id}`)
              }
            >
              <td className="px-6 py-4">{index + 1}</td>
              <td className="px-6 py-4">{submission.verdict}</td>
              <td className="px-6 py-4">{langIdToName[submission.language]}</td>
              <td className="px-6 py-4">{submission.executionTime} ms</td>
              <td className="px-6 py-4">{submission.memoryUsage} KB</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProblemSubmissions;
