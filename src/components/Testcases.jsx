import React from "react";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

const Testcases = ({testCases, testcasesStatus}) => {
  const [status, setStatus] = useState([]);

  const handleSetStatus = async (testcasesStatus) => {
    setStatus(testcasesStatus);
  }
  useEffect(() => {
    handleSetStatus(testcasesStatus);
  }
  , [testcasesStatus]);

  if (!testCases) {
    return <div>No test cases available</div>;
  }
  console.log("Test Cases:", testCases);
  console.log("Test Cases Status:", testcasesStatus);
  // console.log(JSON.parse(testCases[0].input));
  return (
    <div>
      {testCases.map((testCase, index) => (
        <div
          key={index}
          style={{ margin: "10px", padding: "10px", border: "1px solid #ccc" }}
        >
          <h3>Test Case {index + 1}</h3>
          <p>
            <strong>Input:</strong> {testCase.input}
          </p>
          <p>
            <strong>Input:</strong> {testCase.stdin}
          </p>
          <p>
            <strong>Expected Output:</strong> {JSON.stringify(testCase.output)}
          </p>
          {testcasesStatus.length > 0 && (
          <p>
             <strong>Status:</strong> {testcasesStatus[index].status.id}
          </p>)}
        </div>
      ))}
    </div>
  );
};

export default Testcases;
