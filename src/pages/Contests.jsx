import { React } from "react";
import { useState, useEffect } from "react";
import { fetchContests } from "../api/api";
import { parseDate, calculateDuration } from "../utils/date";
import { Link, Navigate } from "react-router-dom";
import { UserContext } from "../providers/userProvider";
import { useContext } from "react";

export default function Contests() {
  const [contest, setContest] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useContext(UserContext);
  const [redirectUrl, setRedirectUrl] = useState(false);

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
    if (!user) {
      window.location.href = "/register";
      setRedirectUrl("/register");
    } else {
      console.log("user in problem page: ", user);
    }
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
