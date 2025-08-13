import React, { useState } from "react";
import { addTestCase } from "../api/api";

const AddTestCase = () => {
  const [problemId, setProblemId] = useState("");
  const [stdin, setStdin] = useState("");
  const [stdout, setStdout] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addTestCase({
        problemId,
        stdin,
        stdout,
        isPublic,
      });
      setSuccess(true);
    } catch (error) {
      console.error("Error adding test case:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-24">
      <div className="bg-white shadow-lg rounded-lg p-8">
        <h2 className="text-3xl font-bold text-center mb-6">Add Test Case</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1">Problem ID</label>
            <input
              type="text"
              required
              value={problemId}
              onChange={(e) => setProblemId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Stdin</label>
            <textarea
              required
              rows={2}
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Stdout</label>
            <textarea
              required
              rows={2}
              value={stdout}
              onChange={(e) => setStdout(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              id="isPublic"
              className="mr-2 accent-blue-600"
            />
            <label htmlFor="isPublic" className="text-gray-700">
              Is Public
            </label>
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded bg-blue-600 text-white font-semibold transition ${
              loading ? "opacity-60 cursor-not-allowed" : "hover:bg-blue-700"
            }`}
          >
            {loading ? "Submitting..." : "Add Test Case"}
          </button>
          {success && (
            <div className="text-green-600 text-center mt-2">
              Test case added successfully!
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AddTestCase;
