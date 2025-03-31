import React from "react";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

const Testcases = (testCases) => {
  if (!testCases) {
    return <div>No test cases available</div>;
  }
  const testCasesData = testCases.testCases;
  // console.log(JSON.parse(testCases[0].input));
  return (
    <div>
      {testCasesData.map((testCase, index) => (
        <div
          key={index}
          style={{ margin: "10px", padding: "10px", border: "1px solid #ccc" }}
        >
          <h3>Test Case {index + 1}</h3>
          <p>
            <strong>Input:</strong> {testCase.input}
          </p>
          <p>
            <strong>Expected Output:</strong> {JSON.stringify(testCase.output)}
          </p>
        </div>
      ))}
    </div>
  );
};

export default Testcases;
