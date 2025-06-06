import { useState, useEffect, useRef, useCallback } from "react";
import "../App.css";
import { fetchProblem, fetchTestcases } from "../api/api";
import { executeCode, pollSubmissionStatus, submitProblem } from "../api/api";
// import CodeEditor from "../pages/codeeditor";
import TestCases from "../components/Testcases";
import { useParams, Navigate } from "react-router-dom";
import useUserStore from "../store/userStore";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import latentNavLogo from "../assets/latentNavLogo.png";
import { LuAlarmClock } from "react-icons/lu";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import DifficultyTag from "../components/DifficultyTag";

function Problem() {
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.accessToken);
  const [code, setCode] = useState("// Write your code here...");
  const [result, setResult] = useState([]);
  const [submissionResult, setSubmissionResult] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testCases, setTestCases] = useState([]);
  const [testCaseLoading, setTestCaseLoading] = useState(true);
  const [testCaseError, setTestCaseError] = useState(null);
  const [langId, setLangId] = useState(54);
  const { id } = useParams();
  const [screenHeight, setScreenHeight] = useState(window.innerHeight - 75);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [tile1Height, setTile1Height] = useState((window.innerHeight - 75) / 2);
  const [tile2Height, setTile2Height] = useState((window.innerHeight - 75) / 2);
  const [tile1Width, setTile1Width] = useState(window.innerWidth / 2 - 10);
  const [tile2Width, setTile2Width] = useState(window.innerWidth / 2 - 10);
  const [tile3Width, setTile3Width] = useState(window.innerWidth / 2 - 10);
  const containerRef = useRef(null);

  const minTileWidth = 200;
  const minTileHeight = 100;

  const fetchTestCases = async () => {
    try {
      const response = await fetchTestcases(id);
      setTestCases([...response]);
      console.log("Test Cases:", response);
    } catch (err) {
      setTestCaseError(err);
    } finally {
      setTestCaseLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetchProblem(id);
      setData(response);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSubmit = async () => {
    if (!code || !testCases || !langId) {
      console.error("Code, test cases, or language ID is missing");
      return;
    }

    setTestCaseLoading(true);

    console.log("Submitted Code:", code);
    // Simulate an API call to execute the code
    executeCode(code, testCases, langId)
      .then(async (result) => {
        // long poll the server for submission status
        console.log("Result:", result);
        pollSubmissionStatus(result, id, 0, code, langId)
          .then((data) => {
            console.log("Polling Response:", data);
            setResult(data);
            setTestCaseLoading(false);
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
      const result = await submitProblem(code, id, langId, null, user.id);
      console.log("Result:", result);
      setSubmissionResult(result);
    } catch (error) {
      console.error("Error submitting code:", error);
      setError(error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchTestCases();

    const handleResize = () => {
      setScreenHeight(window.innerHeight);
      setScreenWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }
  if (error) {
    return <div>Error: {error.message}</div>;
  }
  if (!data) {
    return <div>No data available</div>;
  }

  // useEffect(() => {
  //   const handleResize = () => {
  //     setScreenHeight(window.innerHeight);
  //     setScreenWidth(window.innerWidth);
  //   };
  //   window.addEventListener("resize", handleResize);
  //   return () => window.removeEventListener("resize", handleResize);
  // }, []);

  const startHorizontalDrag = (e) => {
    const startX = e.clientX;
    const initialTile3Width = tile3Width;
    const initialTile1Width = tile1Width;

    document.body.style.userSelect = "none";

    const onMouseMove = (e) => {
      const delta = e.clientX - startX;
      const newTile3Width = Math.max(minTileWidth, initialTile3Width - delta);
      const newTile1Width = screenWidth - newTile3Width - 12; // accounting for drag handle

      if (newTile1Width >= minTileWidth) {
        setTile3Width(newTile3Width);
        setTile1Width(newTile1Width);
        setTile2Width(newTile1Width); // keep tile1 and tile2 in sync
      }
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const startVerticalDrag = (e) => {
    const startY = e.clientY;
    const initialTile1Height = tile1Height;
    const initialTile2Height = tile2Height;

    document.body.style.userSelect = "none";

    const onMouseMove = (e) => {
      const delta = e.clientY - startY;
      const newTile1Height = Math.max(
        minTileHeight,
        initialTile1Height + delta
      );
      const newTile2Height = Math.max(
        minTileHeight,
        initialTile2Height - delta
      );

      // if (newTile1Height + newTile2Height <= screenHeight - 12) {
      setTile1Height(newTile1Height);
      setTile2Height(newTile2Height);
      // }
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div className="flex flex-col h-screen w-full box-border bg-black overflow-hidden">
      <div className="flex justify-between items-center px-8 pt-2 text-white h-[75px] overflow-hidden">
        <div>
          <img src={latentNavLogo} className="h-8 w-8" />
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-white/50 flex items-center gap-2">
            <button
              className="py-2 px-4 rounded-md bg-[#ffffff25] items-center hover:bg-[#ffffff35] transition-all duration-300 cursor-pointer"
              onClick={handleRunSubmit}
            >
              Run
            </button>
          </div>
          <div className="text-sm text-white/50 flex items-center gap-2">
            <button
              className="py-2 px-4 rounded-md bg-[#ffffff25] items-center hover:bg-[#ffffff35] transition-all duration-300 cursor-pointer"
              onClick={handleSubmit}
            >
              Submit
            </button>
          </div>
          <div className="text-sm text-white/50 flex items-center gap-2">
            Start Timer:{" "}
            <button className="p-2 rounded-md bg-[#ffffff25] items-center hover:bg-[#ffffff35] transition-all duration-300 cursor-pointer">
              <LuAlarmClock className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex items-center">
          <div className="rounded-full bg-white/50 text-sm text-white h-8 w-8"></div>
        </div>
      </div>
      <div
        ref={containerRef}
        className="flex px-4 py-2 h-screen w-full box-border"
      >
        {/* Left column */}
        <div className="flex flex-col" style={{ width: tile1Width }}>
          <div
            className="p-4 rounded-xl bg-[#212121] overflow-auto border border-1 border-[#ffffff25] scrollbar"
            style={{ height: tile1Height }}
          >
            <ProblemDesciptionComponent data={data} />
          </div>

          {/* Vertical Drag Handle */}
          <div
            onMouseDown={startVerticalDrag}
            className="h-2 cursor-row-resize bg-[#ffffff15] flex items-center justify-center"
          >
            <div className="w-4 h-[2px] bg-white/20 rounded-full"></div>
          </div>

          <div
            className="p-4 rounded-xl bg-[#212121] overflow-auto border border-1 border-[#ffffff25] scrollbar"
            style={{ height: tile2Height }}
          >
            <TestCases
              testCases={testCases}
              testcasesStatus={result}
              isLoading={testCaseLoading}
            />
          </div>
        </div>

        {/* Horizontal Drag Handle */}
        <div
          onMouseDown={startHorizontalDrag}
          className="w-2 cursor-col-resize bg-[#ffffff15] flex items-center justify-center"
        >
          <div className="w-[2px] h-4 bg-white/20 rounded-full"></div>
        </div>

        {/* Right Column: Code Editor */}
        <div
          className="p-4 rounded-xl bg-[#212121] overflow-auto border border-1 border-[#ffffff25] scrollbar"
          style={{ width: tile3Width, height: screenHeight + 8 }}
        >
          Here goes Monaco Code Editor
          <CodeEditor langId={langId} code={code} SetCode={setCode} />
        </div>
      </div>
    </div>
  );
}

const ProblemDesciptionComponent = ({ data }) => {
  console.log("Problem Data:", data);
  return (
    <div className="problem-description">
      <h1 className="text-3xl font-semibold">{data.title}</h1>
      <div className="mt-1 flex gap-2">
        <DifficultyTag tag={data.difficulty} />
        <div>
          {data.tags.map((tag) => (
            <p
              key={tag.id}
              className="px-3 py-1 rounded-full text-sm font-medium bg-white/15 text-white/50"
            >
              {tag.tag}
            </p>
          ))}
        </div>
      </div>
      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
        {data.description}
      </ReactMarkdown>
      <p>Max Time Limit: {data.max_time_limit} seconds</p>
      <p>Max Memory Limit: {data.max_memory_limit / 1024} MB</p>
    </div>
  );
};

const CodeEditor = ({ langId, code, SetCode }) => {
  // const [code, setCode] = useState("// Write your code here...");
  // const [result, setResult] = useState([]);
  // const [error, setError] = useState(null);
  // const [testCases, setTestCases] = useState([]);
  // const [testCaseLoading, setTestCaseLoading] = useState(true);
  // const [testCaseError, setTestCaseError] = useState(null);
  // const [submissionResult, setSubmissionResult] = useState([]);

  // const fetchTestCases = async () => {
  //   try {
  //     const response = await fetchTestcases(problemId);
  //     setTestCases([...response]);
  //     console.log("Test Cases:", response);
  //   } catch (err) {
  //     setTestCaseError(err);
  //   } finally {
  //     setTestCaseLoading(false);
  //   }
  // };

  const handleEditorChange = (event) => {
    SetCode(event.target.value);
  };

  // const handleRunSubmit = async () => {
  //   console.log("Submitted Code:", code);
  //   // Simulate an API call to execute the code
  //   executeCode(code, testCases, langId)
  //     .then(async (result) => {
  //       // long poll the server for submission status
  //       console.log("Result:", result);
  //       pollSubmissionStatus(result, problemId, 0, code, langId)
  //         .then((data) => {
  //           console.log("Polling Response:", data);
  //           setResult(data);
  //         })
  //         .catch((error) => {
  //           console.error("Error polling submission status:", error);
  //         });
  //     })
  //     .catch((error) => {
  //       console.error("Error executing code:", error);
  //       setError(error);
  //     });
  // };
  // const handleSubmit = async () => {
  //   console.log("Submitted Code:", code);
  //   try {
  //     const result = await submitProblem(code, problemId, langId, null, userId);
  //     console.log("Result:", result);
  //     setSubmissionResult(result);
  //   } catch (error) {
  //     console.error("Error submitting code:", error);
  //     setError(error);
  //   }
  // };

  // useEffect(() => {
  //   fetchTestCases();
  // }, []);

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
      {/* <div className="submission flex flex-col">
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
      </div> */}

      {/* {result && (
        <div
          style={{
            marginTop: "20px",
            padding: "10px",
            backgroundColor: "#212121",
            borderRadius: "4px",
          }}
        >
          <h3>Result:</h3>
          <pre>{JSON.stringify(result)}</pre>
        </div>
      )} */}
      {/* {submissionResult.length > 0 && (
        <div
          style={{
            marginTop: "20px",
            padding: "10px",
            backgroundColor: "#212121",
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
          <Testcases testCases={testCases} testcasesStatus={result} />
        </>
      )} */}
    </div>
  );
};

export default Problem;

// run testcases flow
// problemID
// fetch testcases for problemID
// submit the code with testcases (batch submission)
// get the tokens for the submissions
// poll the server for submission status
// get the results for the submissions
// show the results in UI

// submit code flow
// get the code from the editor
// submit the code to the server
// get the token for the submission
// poll the server for submission status
// get the result for the submission
// show the result in UI
// populate database with submission result
