// filepath: /Users/hiteshgupta/Documents/codegotlatent/src/pages/codeeditor.jsx
import React, { useState, useEffect, use } from "react";
import {
  executeCode,
  pollSubmissionStatus,
  submitCode,
  submitProblem,
} from "../api/api";
import Testcases from "../components/Testcases";
import { fetchTestcases } from "../api/api";

const ContestCodeEditor = ({ problemId, langId, contestId, userId }) => {
  const [code, setCode] = useState("// Write your code here...");
  const [result, setResult] = useState([]);
  const [error, setError] = useState(null);
  const [testCases, setTestCases] = useState([]);
  const [testCaseLoading, setTestCaseLoading] = useState(true);
  const [testCaseError, setTestCaseError] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);

  const fetchTestCases = async () => {
    try {
      const response = await fetchTestcases(problemId);
      setTestCases([...response]);
      console.log("Test Cases:", response);
    } catch (err) {
      setTestCaseError(err);
    } finally {
      setTestCaseLoading(false);
    }
  };

  const handleEditorChange = (event) => {
    setCode(event.target.value);
  };

  const handleRunSubmit = async () => {
    console.log("Submitted Code:", code);
    // Simulate an API call to execute the code
    executeCode(code, testCases, langId, problemId)
      .then(async (result) => {
        // long poll the server for submission status
        console.log("Result:", result);
        pollSubmissionStatus(result, problemId, 0, code, langId)
          .then((data) => {
            console.log("Polling Response:", data);
            setResult(data);
          })
          .catch((error) => {
            console.error("Error polling submission status:", error);
          });
      })
      .catch((error) => {
        console.error("Error executing code:", error);
        setError(error);
      });
  };
  const handleSubmit = async () => {
    console.log("Submitted Code:", code);
    try {
      const result = await submitProblem(
        code,
        problemId,
        langId,
        contestId,
        userId
      );
      console.log("Result:", result);
      setSubmissionResult(result);
    } catch (error) {
      console.error("Error submitting code:", error);
      setError(error);
    }
  };

  useEffect(() => {
    fetchTestCases();
  }, []);

  return (
    <div style={{ height: "40vh", display: "flex", flexDirection: "column" }}>
      <textarea
        style={{
          flex: 1,
          width: "100%",
          padding: "10px",
          fontSize: "16px",
          fontFamily: "monospace",
          border: "1px solid #ccc",
          borderRadius: "4px",
          minHeight: "200px",
        }}
        value={code}
        onChange={handleEditorChange}
      />
      <div className="submission flex flex-col">
        <button
          onClick={handleRunSubmit}
          style={{
            marginTop: "10px",
            padding: "10px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Run Code
        </button>
        <button
          onClick={handleSubmit}
          style={{
            marginTop: "10px",
            padding: "10px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Submit Code
        </button>
      </div>

      {result && (
        <div
          style={{
            marginTop: "20px",
            padding: "10px",
            backgroundColor: "#f8f9fa",
            borderRadius: "4px",
          }}
        >
          <h3>Result:</h3>
          <pre>{JSON.stringify(result)}</pre>
        </div>
      )}
      {submissionResult && (
        <div
          style={{
            marginTop: "20px",
            padding: "10px",
            backgroundColor: "#f8f9fa",
            borderRadius: "4px",
          }}
        >
          <h3>Submission Result:</h3>
          <pre>{JSON.stringify(submissionResult)}</pre>
        </div>
      )}
      {testCaseLoading ? (
        <div>Loading Test Cases...</div>
      ) : testCaseError ? (
        <div>Error: {testCaseError.message}</div>
      ) : (
        <>
          {/* <ContestCodeEditor problemId={id} testCases={testCases} langId={langId} /> */}
          <Testcases testCases={testCases} testcasesStatus={result} />
        </>
      )}
    </div>
  );
};

export default ContestCodeEditor;
