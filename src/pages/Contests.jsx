import { React } from "react";
import { useState, useEffect } from "react";
import { fetchContests } from "../api/api";
import { parseDate, calculateDuration } from "../utils/date";
import { Link, Navigate } from "react-router-dom";
import useUserStore from "../store/userStore";

export default function Contests() {
  const [contest, setContest] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useUserStore((state) => state.user);
  const userId = user.id;
  console.log(userId);

  const fetchAllContests = async () => {
    try {
      const response = await fetchContests();
      //   console.log("Response:", response);
      setContest(response);
    } catch (error) {
      console.error("Error fetching contest:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAllContests();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Contests</h1>

      {contest.map((contest) => (
        <div key={contest.id}>
          <Link to={`/contest/${contest.id}`}>
            <div>
              <h2>{contest.title}</h2>
              <p>{contest.description}</p>
              <p>Start Time: {parseDate(contest.startTime)}</p>
              <p>
                Duration :{" "}
                {calculateDuration(contest.startTime, contest.endTime)}
              </p>
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}
