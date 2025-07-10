import { useState, useEffect, useRef, useCallback } from "react";
import "../App.css";
import { fetchProblem } from "../api/api";
import { executeCode, pollSubmissionStatus, submitProblem } from "../api/api";
// import CodeEditor from "../pages/codeeditor";
import TestCases from "../components/Testcases";
import { useParams, Navigate, Link } from "react-router-dom";
import useUserStore from "../store/userStore";
import "react-resizable/css/styles.css";
import latentNavLogo from "../assets/latentNavLogo.png";
import { LuAlarmClock } from "react-icons/lu";
import "highlight.js/styles/github.css";
import SubmitDialog from "../components/submitDailog";
import { Loader2, Play, UploadCloud } from "lucide-react";
import ProblemDescription from "../components/ProblemDescription";
import CodeEditor from "../components/CodeEditor";
import ProblemTab from "../components/ProblemTab";
import ProblemSubmissions from "../components/ProblemSubmissions";
import { ClockFading, File } from "lucide-react";
import { avatars } from "../components/Avatars";

function Problem() {
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.accessToken);
  const [result, setResult] = useState([]);
  const [submissionResult, setSubmissionResult] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testCases, setTestCases] = useState([]);
  const [testCaseLoading, setTestCaseLoading] = useState(false);
  const [testCaseError, setTestCaseError] = useState(null);
  const { id } = useParams();
  let savedCode = localStorage.getItem(`code${id}`);
  let savedLangId = localStorage.getItem(`langId${id}`);
  const [langId, setLangId] = useState(
    savedLangId ? parseInt(savedLangId) : 54
  );
  const [code, setCode] = useState(savedCode || "// Write your code here\n\n");
  const [screenHeight, setScreenHeight] = useState(window.innerHeight - 75);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [tile1Height, setTile1Height] = useState((window.innerHeight - 75) / 2);
  const [tile2Height, setTile2Height] = useState((window.innerHeight - 75) / 2);
  const [tile1Width, setTile1Width] = useState(window.innerWidth / 2 - 10);
  const [tile2Width, setTile2Width] = useState(window.innerWidth / 2 - 10);
  const [tile3Width, setTile3Width] = useState(window.innerWidth / 2 - 10);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [resultLoading, setResultLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const containerRef = useRef(null);

  const [tabId, setTabId] = useState(0);
  const minTileWidth = 200;
  const minTileHeight = 100;

  // const fetchTestCases = async () => {
  //   try {
  //     const response = await fetchTestcases(id);
  //     setTestCases([...response]);
  //     console.log("Test Cases:", response);
  //   } catch (err) {
  //     setTestCaseError(err);
  //   } finally {
  //     setTestCaseLoading(false);
  //   }
  // };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetchProblem(id, user.id);
      setData(response);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSubmit = useCallback(
    async (currentCode = null) => {
      // Use passed code or fallback to state/localStorage
      const codeToUse =
        currentCode || code || localStorage.getItem(`code${id}`) || "";

      if (!codeToUse || !data || !data.testCases || !langId) {
        console.error("Code, data, test cases, or language ID is missing");
        return;
      }

      // Update state with the current code if passed
      if (currentCode) {
        setCode(currentCode);
      }

      setTestCaseLoading(true);
      setRunLoading(true);
      setResult([]);

      if (data.testCases.length === 0) {
        alert("No public test cases available for this problem");
        setTestCaseLoading(false);
        setRunLoading(false);
        return;
      }
      console.log("Submitted Code:", codeToUse);
      // Simulate an API call to execute the code
      console.log("Executing testcases", data.testCases);
      executeCode(codeToUse, data.testCases, langId, id)
        .then(async (result) => {
          // long poll the server for submission status
          console.log("Result:", result);
          pollSubmissionStatus(result, id, codeToUse, langId)
            .then((data) => {
              console.log("Polling Response:", data);
              setResult(data);
              setTestCaseLoading(false);
              setRunLoading(false);
            })
            .catch((error) => {
              console.error("Error polling submission status:", error);
              setTestCaseLoading(false);
              setRunLoading(false);
            });
        })
        .catch((error) => {
          console.error("Error executing code:", error);
          setError(error);
          setTestCaseLoading(false);
          setRunLoading(false);
          if (error.response && error.response.status === 429) {
            alert("You have exceeded the rate limit. Please try again later.");
          }
        });
    },
    [code, data, langId, id]
  );

  const handleSubmit = useCallback(
    async (currentCode = null) => {
      // Use passed code or fallback to state/localStorage
      const codeToUse =
        currentCode || code || localStorage.getItem(`code${id}`) || "";

      if (!codeToUse || !data || !langId) {
        console.error("Code, data, or language ID is missing");
        return;
      }

      // Update state with the current code if passed
      if (currentCode) {
        setCode(currentCode);
      }

      console.log("Submitted Code:", codeToUse);
      try {
        setResultLoading(true);
        const result = await submitProblem(
          codeToUse,
          id,
          langId,
          null,
          user.id
        );
        console.log("Result:", result);
        setSubmissionResult(result);
        setResultLoading(false);
        setDialogOpen(true);
      } catch (error) {
        console.error("Error submitting code:", error);
        setError(error);
        setResultLoading(false);
        if (error.response && error.response.status === 429) {
          alert("You have exceeded the rate limit. Please try again later.");
        }
      }
    },
    [code, data, langId, id, user.id]
  );

  // useEffect(() => {

  // }, []);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleKeyDown = async (event) => {
      if (event.ctrlKey && event.key === "'") {
        // run code
        event.preventDefault();
        console.log("Ctrl + ' pressed!");
        if (!runLoading && data && data.testCases) {
          console.log("Running code...");
          // Get the current code from localStorage or state
          const currentCode = localStorage.getItem(`code${id}`) || code;
          await handleRunSubmit(currentCode);
        }
        // Your custom logic here
      }

      if (event.ctrlKey && event.key === "Enter") {
        event.preventDefault();
        console.log("Ctrl + Enter pressed!");
        if (!resultLoading && data) {
          console.log("Submitting code...");
          // Get the current code from localStorage or state
          const currentCode = localStorage.getItem(`code${id}`) || code;
          await handleSubmit(currentCode);
        }
        // e.g., close a modal
      }
    };

    const handleResize = () => {
      setScreenHeight(window.innerHeight);
      setScreenWidth(window.innerWidth);
    };

    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [runLoading, resultLoading, data, code, handleRunSubmit, handleSubmit]);

  if (loading) {
    return <div>Loading...</div>;
  }
  if (error && error.response.status != 429) {
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
        setTile2Width(newTile1Width); // keep tile1 and tile2 in syncxw
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
      <SubmitDialog
        isOpen={isDialogOpen}
        onClose={() => setDialogOpen(false)}
        verdict={submissionResult.verdict}
        submissionId={submissionResult.id}
      />
      <div className="flex justify-between items-center px-8 pt-2 text-white h-[75px] overflow-hidden">
        <Link to={"/home"}>
          <img src={latentNavLogo} className="h-8 w-8" />
        </Link>
        <div className="flex items-center gap-1">
          <div className="text-sm text-white/50 flex items-center gap-2">
            {runLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <button
                className="py-2 px-4 rounded-md bg-[#ffffff25] items-center hover:bg-[#ffffff35] transition-all duration-300 cursor-pointer"
                onClick={() => handleRunSubmit(code)}
              >
                Run <Play className="h-3 w-3 inline-block ml-1 fill-white/65" />
              </button>
            )}
          </div>
          <div className="text-sm text-white/50 flex items-center gap-2">
            {resultLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <button
                className="py-2 px-4 rounded-md bg-[#ffffff25] items-center hover:bg-[#ffffff35] transition-all duration-300 cursor-pointer text-green-500"
                onClick={() => handleSubmit(code)}
              >
                Submit <UploadCloud className="h-4 w-4 inline-block ml-1" />
              </button>
            )}
          </div>
          <div className="text-sm text-white/50 flex items-center gap-2">
            Start Timer:{" "}
            <button className="p-2 rounded-md bg-[#ffffff25] items-center hover:bg-[#ffffff35] transition-all duration-300 cursor-pointer">
              <LuAlarmClock className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex items-center">
          {/* <div className="rounded-full bg-white/50 text-sm text-white h-8 w-8"></div> */}
          <Link to={`/user/${user?.username}`} className="hover:opacity-80">
            <img
              src={avatars[user?.pfpId - 1] || null}
              alt=""
              className="h-10 w-10 rounded-full mr-2 bg-black"
            />
          </Link>
        </div>
      </div>
      <div
        ref={containerRef}
        className="flex px-4 py-2 h-screen w-full box-border"
      >
        {/* Left column */}
        <div className="flex flex-col" style={{ width: tile1Width }}>
          <div
            className="pb-1 pl-4 pr-4 rounded-xl bg-[#212121] overflow-auto border-1 border-[#ffffff25] scrollbar flex flex-col"
            style={{ height: tile1Height }}
          >
            <div className="tabs w-full flex flex-row justify-start gap-1 items-center mb-1 border-b border-[#ffffff15] pt-1 pb-0.5">
              <div className="flex gap-0.5 items-center justify-center">
                <ProblemTab
                  // title={"Problem"}
                  title={
                    <div className="flex gap-0.5 items-center justify-center">
                      <File className="inline-block mr-1 h-4 w-4 text-white/50" />{" "}
                      <span>Problem</span>
                    </div>
                  }
                  tabId={tabId}
                  index={0}
                  onClick={() => setTabId(0)}
                />
              </div>
              <div className="flex gap-0.5 items-center justify-center">
                <ProblemTab
                  title={
                    <div className="flex gap-0.5 items-center justify-center">
                      <ClockFading className="inline-block mr-1 h-4 w-4 text-white/50" />{" "}
                      <span>Submissions</span>
                    </div>
                  }
                  tabId={tabId}
                  index={1}
                  onClick={() => setTabId(1)}
                />
              </div>
            </div>
            {tabId === 0 && <ProblemDescription data={data} />}
            {tabId === 1 && (
              <ProblemSubmissions problemId={id} userId={user.id} />
            )}
          </div>

          {/* Vertical Drag Handle */}
          <div
            onMouseDown={startVerticalDrag}
            className="h-2 cursor-row-resize bg-[#ffffff15] flex items-center justify-center"
          >
            <div className="w-4 h-[2px] bg-white/20 rounded-full"></div>
          </div>

          <div
            className="p-4 rounded-xl bg-[#212121] overflow-auto border-1 border-[#ffffff25] scrollbar"
            style={{ height: tile2Height }}
          >
            <TestCases
              testCases={data.testCases}
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
        {/* <div
          className="p-4 rounded-xl bg-[#212121] overflow-auto border-1 border-[#ffffff25] scrollbar"
          style={{ width: tile3Width, height: screenHeight + 8 }}
        >
          Here goes Monaco Code Editor
          <CodeEditor langId={langId} code={code} SetCode={setCode} />
        </div> */}
        {/* </div> */}
        {/* Right Column: Code Editor */}
        <div
          className="rounded-xl bg-[#212121] overflow-auto border-1 border-[#ffffff25] scrollbar"
          style={{ width: tile3Width, height: screenHeight + 8 }}
        >
          <label htmlFor="languages" className="text-sm text-white p-4">
            Choose a Language:
          </label>
          <select
            id="languages"
            name="languages"
            className="bg-[#ffffff15] text-white py-1 ml-2 rounded-md text-sm my-1 border border-[#ffffff25] focus:outline-none focus:border-[#ffffff50]"
            value={langId}
            onChange={(e) => {
              const newLangId = parseInt(e.target.value);
              setLangId(newLangId);
              localStorage.setItem(`langId${id}`, newLangId.toString());
            }}
          >
            <option value={54} className="bg-[#ffffff15] text-black">
              C++
            </option>
            <option value={71} className="bg-[#ffffff15] text-black">
              Python
            </option>
            <option value={63} className="bg-[#ffffff15] text-black">
              JavaScript
            </option>
            <option value={62} className="bg-[#ffffff15] text-black">
              Java
            </option>
          </select>
          <CodeEditor
            langId={langId}
            code={code}
            SetCode={setCode}
            probId={id}
            handleRunSubmit={handleRunSubmit}
            handleSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}

export default Problem;

// // run testcases flow
// // problemID
// // fetch testcases for problemID
// // submit the code with testcases (batch submission)
// // get the tokens for the submissions
// // poll the server for submission status
// // get the results for the submissions
// // show the results in UI

// // submit code flow
// // get the code from the editor
// // submit the code to the server
// // get the token for the submission
// // poll the server for submission status
// // get the result for the submission
// // show the result in UI
// // populate database with submission result
