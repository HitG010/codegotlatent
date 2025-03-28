// filepath: /Users/hiteshgupta/Documents/codegotlatent/src/pages/codeeditor.jsx
import React, { useState } from "react";
import { executeCode } from "../api/api";

const CodeEditor = () => {
  const [code, setCode] = useState("// Write your code here...");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleEditorChange = (event) => {
    setCode(event.target.value);
  };

  const handleSubmit = async () => {
    console.log("Submitted Code:", code);
    // Simulate an API call to execute the code
    const result = await executeCode(code);
    if (result) {
      setResult(result);
    }
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
          padding: "10px 20px",
          backgroundColor: "#007BFF",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          marginTop: "10px",
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
