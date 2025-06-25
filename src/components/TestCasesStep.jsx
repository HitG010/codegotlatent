import React, { useState } from "react";

export default function TestCasesStep({ data, setData }) {
  const [testCase, setTestCase] = useState({
    input: "",
    stdin: "",
    stdout: "",
    output: "",
    isPublic: true,
  });

  const addTestCase = () => {
    if (testCase.stdin.trim() && testCase.stdout.trim()) {
      setData({ ...data, testCases: [...data.testCases, testCase] });
      setTestCase({
        input: "",
        stdin: "",
        stdout: "",
        output: "",
        isPublic: true,
      });
    }
  };

  const removeTestCase = (index) => {
    setData({
      ...data,
      testCases: data.testCases.filter((_, idx) => idx !== index),
    });
  };

  const updateField = (field) => (e) =>
    setTestCase({ ...testCase, [field]: e.target.value });

  return (
    <div className="bg-white dark:bg-gray-900 shadow-md rounded-xl p-6 space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
        Add Test Cases
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-gray-700 dark:text-gray-300">
            Input (display only)
          </label>
          <input
            placeholder="e.g., 2 3"
            value={testCase.input}
            onChange={updateField("input")}
            className="w-full px-4 py-2 border rounded-md dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-700 dark:text-gray-300">
            Output (display only)
          </label>
          <input
            placeholder="e.g., 5"
            value={testCase.output}
            onChange={updateField("output")}
            className="w-full px-4 py-2 border rounded-md dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-gray-700 dark:text-gray-300">
          Standard Input (`stdin`)
        </label>
        <textarea
          rows={2}
          placeholder="Raw input for Judge0"
          value={testCase.stdin}
          onChange={updateField("stdin")}
          className="w-full px-4 py-2 border rounded-md dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm text-gray-700 dark:text-gray-300">
          Expected Output (`stdout`)
        </label>
        <textarea
          rows={2}
          placeholder="Expected output from code"
          value={testCase.stdout}
          onChange={updateField("stdout")}
          className="w-full px-4 py-2 border rounded-md dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={testCase.isPublic}
          onChange={(e) =>
            setTestCase({ ...testCase, isPublic: e.target.checked })
          }
        />
        <label className="text-sm text-gray-700 dark:text-gray-300">
          Public Test Case
        </label>
      </div>

      <button
        onClick={addTestCase}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
      >
        ➕ Add Test Case
      </button>

      {data.testCases.length > 0 && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Added Test Cases
          </h3>
          {data.testCases.map((tc, idx) => (
            <div
              key={idx}
              className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md shadow-sm space-y-2"
            >
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Input:</strong> {tc.input || "(hidden)"}
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <strong>stdin:</strong>
                <pre className="bg-white dark:bg-gray-900 p-2 rounded overflow-x-auto">
                  {tc.stdin}
                </pre>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <strong>stdout:</strong>
                <pre className="bg-white dark:bg-gray-900 p-2 rounded overflow-x-auto">
                  {tc.stdout}
                </pre>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {tc.isPublic ? "🌐 Public" : "🔒 Hidden"}
              </div>
              <button
                onClick={() => removeTestCase(idx)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                ❌ Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
