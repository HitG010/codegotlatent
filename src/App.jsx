import { useState, useEffect } from "react";
import "./App.css";
import { api } from "./api/api";
import CodeEditor from "./pages/codeeditor";

function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api();
      setData(response);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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

  return (
    <>
      <h1>HELLLO</h1>
      <h2>Data</h2>
      <pre>{JSON.stringify(data)}</pre>
      <h2>Code Editor</h2>
      <CodeEditor></CodeEditor>
    </>
  );
}

export default App;
