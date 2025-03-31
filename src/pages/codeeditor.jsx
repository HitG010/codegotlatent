// filepath: /Users/hiteshgupta/Documents/codegotlatent/src/pages/codeeditor.jsx
import React, { useState } from "react";
import { executeCode, pollSubmissionStatus } from "../api/api";

const CodeEditor = ({ testCases, langId }) => {
  const [code, setCode] = useState("// Write your code here...");
  const [result, setResult] = useState(null);
  // Removed unused error state

  const handleEditorChange = (event) => {
    setCode(event.target.value);
  };

  const handleSubmit = async () => {
    console.log("Submitted Code:", code);
    // Simulate an API call to execute the code
    executeCode(code, testCases, langId)
      .then(async (result) => {
        // long poll the server for submission status
        const data = await pollSubmissionStatus(result);
        console.log("Polling Response:", data);
        setResult(data);
      })
      .catch((error) => {
      console.error("Error executing code:", error);
      setError(error);
      });
  };

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
        }}
        value={code}
        onChange={handleEditorChange}
      />
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
    </div>
  );
};

export default CodeEditor;
