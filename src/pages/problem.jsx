import { useState, useEffect, useRef } from "react";
import "../App.css";
import { fetchProblem, fetchTestcases } from "../api/api";
import CodeEditor from "../pages/codeeditor";
import TestCases from "../components/Testcases";
import { useParams, Navigate } from "react-router-dom";
import useUserStore from "../store/userStore";
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';

function Problem() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testCases, setTestCases] = useState([]);
  const [testCaseLoading, setTestCaseLoading] = useState(true);
  const [testCaseError, setTestCaseError] = useState(null);
  const [langId, setLangId] = useState(54);
  const { id } = useParams();
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.accessToken);
  const screenHeight = window.innerHeight;
  const screenWidth = window.innerWidth;
  const [tile1Height, setTile1Height] = useState(screenHeight/2);
  const [tile2Height, setTile2Height] = useState(screenHeight/2);
  const [tile1Width, setTile1Width] = useState(screenWidth/2 - 10);
  const [tile2Width, setTile2Width] = useState(screenWidth/2 - 10);
  const [tile3Width, setTile3Width] = useState(screenWidth/2 - 10);

  const containerRef = useRef(null);

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

  useEffect(() => {
    fetchData();
    fetchTestCases();
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


  const startHorizontalDrag = (e) => {
    const startX = e.clientX;
    const startWidth = tile3Width;

    // Prevent text selection while dragging
    document.body.style.userSelect = 'none';

    const onMouseMove = (e) => {
      const delta = e.clientX - startX;
      setTile3Width(startWidth - delta);
      setTile1Width(startWidth + delta);
      setTile2Width(startWidth + delta);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      // Restore text selection
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Handle vertical drag (between Tile 1 and Tile 2)
  const startVerticalDrag = (e) => {
    const startY = e.clientY;
    const startTile1 = tile1Height;
    const startTile2 = tile2Height;

    // Prevent text selection while dragging
    document.body.style.userSelect = 'none';

    const onMouseMove = (e) => {
      const delta = e.clientY - startY;
      setTile1Height(startTile1 + delta);
      setTile2Height(startTile2 - delta);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      // Restore text selection
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <>
     <div ref={containerRef} className="flex p-4 h-screen w-full box-border">
      {/* Left column */}
      <div className="flex flex-col" style={{ width: tile1Width }}>
        <div
          className="p-4 rounded-xl bg-[#212121]"
          style={{ height: tile1Height }}
        >
          <ProblemDesciptionComponent data={data} />
        </div>

        {/* Vertical Drag Handle */}
        <div
          onMouseDown={startVerticalDrag}
          className="h-2 cursor-row-resize bg-[#ffffff15] flex items-center justify-center"
        ><div className="w-4 h-1 bg-white rounded-full"></div></div>

        <div
          className="p-4 rounded-xl bg-[#212121]"
          style={{ height: tile2Height }}
        >
          here goes Test Cases
        </div>
      </div>

      {/* Horizontal Drag Handle */}
      <div
        onMouseDown={startHorizontalDrag}
        className="w-2 cursor-col-resize bg-[#ffffff15] flex items-center justify-center"
      ><div className="w-1 h-4 bg-white rounded-full"></div></div>

      {/* Tile 3 */}
      <div
        className="p-4 rounded-xl bg-[#212121]"
        style={{ width: tile3Width }}
      >
        Here goes Monaco Code Editor
      </div>
    </div>
      {/* <h2>Code Editor</h2>
      {testCaseLoading ? (
        <div>Loading Test Cases...</div>
      ) : testCaseError ? (
        <div>Error: {testCaseError.message}</div>
      ) : (
        <>
          <CodeEditor problemId={id} langId={langId} userId={user.id} />
        </>
      )} */}
    </>
  );
}

const ProblemDesciptionComponent = ({data}) => {
  return (
    <div className="problem-description">
      <h1>{data.title}</h1>
      <p>{data.description}</p>
      <p>Difficulty: {data.difficulty}</p>
      <p>Max Time Limit: {data.max_time_limit} seconds</p>
      <p>Max Memory Limit: {data.max_memory_limit / 1024} MB</p>
    </div>
  )
}

export default Problem;
