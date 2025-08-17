import React from "react";
import statusCode from "../data/statusCode";
import { Testcase } from "./Testcase";
import { useEffect, useState } from "react";

const Testcases = ({ testCases, testcasesStatus, isLoading }) => {
  // const [status, setStatus] = useState([]);

  // const handleSetStatus = async (testcasesStatus) => {
  //   setStatus(testcasesStatus);
  // };
  // useEffect(() => {
  //   handleSetStatus(testcasesStatus);
  // }, [testcasesStatus]);

  if (testCases.length === 0) {
    return <div className="flex items-center justify-center h-full text-white/65">No public test cases available</div>;
  }
  console.log("Test Cases:", testCases);
  console.log("Test Cases Status:", testcasesStatus);
  // console.log(JSON.parse(testCases[0].input));
  return (
    <div>
      {testCases.map((testCase, index) => (
        <Testcase
          key={index}
          input={testCase.input}
          stdin={testCase.stdin}
          stdout={testCase.stdout}
          output={testCase.output}
          testCaseStatus={
            testcasesStatus && testcasesStatus[index]
              ? testcasesStatus[index]
              : null
          }
          index={index}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
};

export default Testcases;
