import {testCases} from "../data/tc";
import React from 'react'

const TestcasesList = () => {
  return (
    <div>
      {testCases.map((testCase, index) => (
        <div key={index} style={{ margin: "10px", padding: "10px", border: "1px solid #ccc" }}>
          <h3>Test Case {index + 1}</h3>
          <p><strong>Input:</strong> {JSON.stringify(testCase.input)}</p>
          <p><strong>Expected Output:</strong> {JSON.stringify(testCase.expected_output)}</p>
        </div>
      ))}
    </div>
  )
}

export default TestcasesList;
