import { useState, useEffect, use } from "react";
import "../App.css";
import { fetchProblem, fetchTestcases } from "../api/api";
import CodeEditor from "../pages/codeeditor";
import TestCases from "../components/Testcases";
import { useParams, Navigate } from "react-router-dom";
import useUserStore from "../store/userStore";

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

  return (
    <>
      <h1>{data.title}</h1>
      <h2>{data.description}</h2>
      <h2>{data.difficulty}</h2>
      <p>{data.max_time_limit}</p>
      <p>{data.max_memory_limit / 1024}</p>
      <h2>Code Editor</h2>
      {testCaseLoading ? (
        <div>Loading Test Cases...</div>
      ) : testCaseError ? (
        <div>Error: {testCaseError.message}</div>
      ) : (
        <>
          <CodeEditor problemId={id} langId={langId} userId={user.id} />
          {/* <TestCases testCases={testCases} /> */}
        </>
      )}
    </>
  );
}

export default Problem;
