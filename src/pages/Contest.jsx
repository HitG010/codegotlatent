import { React } from "react";
import { useState, useEffect } from "react";
import { getContest } from "../api/api";
import { parseDate, calculateDuration } from "../utils/date";
import { Link, useParams } from "react-router-dom";
export default function Contest() {
  const [contest, setContest] = useState([]);
  const [loading, setLoading] = useState(true);

  const { contestId } = useParams();

  const fetchContest = async () => {
    try {
      const response = await getContest(contestId);
      //   console.log("Response:", response);
      setContest(response);
    } catch (error) {
      console.error("Error fetching contest:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchContest();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Contest</h1>
      <h2>{contest.name}</h2>
      <p>{contest.description}</p>
      <p>Start Time: {parseDate(contest.startTime)}</p>
      <p>End Time: {parseDate(contest.endTime)}</p>
      <p>Duration: {calculateDuration(contest.startTime, contest.endTime)}</p>
    </div>
  );
}
