import React from "react";
import statusCode from "../data/statusCode";
import { Loader2 } from "lucide-react";

export const Testcase = ({
  input,
  stdin,
  output,
  testCaseStatus,
  index,
  isLoading,
}) => {
  console.log("Testcase Status:", testCaseStatus);
  return (
    <div className="relative flex items-start my-2 py-3 px-4 border border-white/10 rounded-xl shadow-lg bg-[#1a1a1a75]">
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between mb-2">
        <span className="text-white/65">Testcase {index + 1}</span>
        {testCaseStatus && (
              <p className="text-gray-300 bg-[#1a1a1a75] rounded-b-xl">
                {/* <span className="font-medium text-gray-400">Status:</span>{" "} */}
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
            </div>
        {isLoading ? (
          <div className="flex items-center space-x-2 mb-2 text-white">
            {/* <svg
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
            </svg> */}
            <Loader2 className="animate-spin h-5 w-5 text-white" />
            <span>Compiling...</span>
          </div>
        ) : (
          <>
            <div className="mb-2 text-gray-300">
              <span className="font-medium text-white block mb-1">
                Input:
              </span>
              <div className="text-sm font-mono bg-[#2a2a2a] p-2 rounded-md">
                {Object.entries(JSON.parse(input)).map(([key, val]) => (
                  <span key={key} className="text-white/65 font-bold text-md">
                    {key} = <span className="text-white">{val}</span>{" "}
                  </span>
                ))}
              </div>
            </div>

            <p className="mb-2 text-white">
              <span className="font-medium text-white">
                Expected Output:
              </span>{" "}
              <div className="text-sm font-mono bg-[#2a2a2a] p-2 rounded-md">
              <span className="text-white">{JSON.stringify(output)}</span>
              </div>
            </p>
            {testCaseStatus && testCaseStatus.stdout && (
              <p className="mb-2 text-white">
                <span className="font-medium text-white">
                Your Output:
              </span>{" "}
              <div className="text-sm font-mono bg-[#2a2a2a] p-2 rounded-md">
              <span className="text-white">{testCaseStatus.stdout}</span>
              </div>
            </p>
            )}
            {testCaseStatus && !testCaseStatus.stdout && (
              <p className="mb-2 text-white">
                <span className="font-medium text-white">
                Error:
              </span>{" "}
              <div className="text-sm font-mono bg-red-500/15 p-2 rounded-md">
              <span className="text-red-500">{testCaseStatus.compile_output}</span>
              </div>
            </p>
            )}
            {/* {testCaseStatus && (
              <p className="mt-4 text-gray-300 absolute inset-0 top-0 right-0 bg-[#1a1a1a75] p-4 rounded-b-xl">
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
            )} */}
          </>
        )}
      </div>
    </div>
  );
};
