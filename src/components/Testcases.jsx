import React from "react";
import { fetchTestcases } from "../api/api";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

const Testcases = (problemId) => {
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTestCases = async () => {
    try {
      const response = await fetchTestcases(problemId);
      setTestCases(response);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchTestCases();
  }, []);
  if (loading) {
    return <div>Loading...</div>;
  }
  if (error) {
    return <div>Error: {error.message}</div>;
  }
  if (!testCases) {
    return <div>No test cases available</div>;
  }

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
            <strong>Expected Output:</strong> {JSON.stringify(testCase.output)}
          </p>
        </div>
      ))}
    </div>
  );
};

export default Testcases;
