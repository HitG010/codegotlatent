import React from "react";
import statusCode from "../data/statusCode";

export const Testcase = ({
  input,
  stdin,
  output,
  testCaseStatus,
  index,
  isLoading,
}) => {
  return (
    <div className="relative flex items-start m-4 p-6 pl-14 border border-gray-700 rounded-2xl shadow-lg bg-[#1a1a1a]">
      {/* Test Case Number Badge */}
      <div className="absolute left-4 top-6 w-8 h-8 rounded-full bg-gray-700 text-white text-sm font-bold flex items-center justify-center">
        #{index + 1}
      </div>

      <div className="flex flex-col w-full">
        {isLoading ? (
          <div className="flex items-center space-x-2 mb-2 text-gray-300">
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              ></path>
            </svg>
            <span>Compiling...</span>
          </div>
        ) : (
          <>
            <div className="mb-2 text-gray-300">
              <span className="font-medium text-gray-400 block mb-1">
                Input:
              </span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-mono">
                {Object.entries(JSON.parse(input)).map(([key, val]) => (
                  <span key={key} className="text-gray-300">
                    {key} = <span className="text-white">{val}</span>
                  </span>
                ))}
              </div>
            </div>

            <p className="mb-2 text-gray-300">
              <span className="font-medium text-gray-400">
                Expected Output:
              </span>{" "}
              <span className="text-white">{JSON.stringify(output)}</span>
            </p>

            {testCaseStatus && (
              <p className="mt-4 text-gray-300">
                <span className="font-medium text-gray-400">Status:</span>{" "}
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    testCaseStatus.status.id === 1
                      ? "bg-green-600 text-white"
                      : "bg-red-600 text-white"
                  }`}
                >
                  {statusCode[testCaseStatus.status.id - 1]}
                </span>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
