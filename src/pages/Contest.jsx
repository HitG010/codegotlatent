import { React } from "react";
import { useState, useEffect } from "react";
import { getContest } from "../api/api";
import { parseDate, calculateDuration } from "../utils/date";
import { Link, useParams, Navigate } from "react-router-dom";
import { UserContext } from "../providers/userProvider";
import { useContext } from "react";

export default function Contest() {
  const [contest, setContest] = useState([]);
  const [loading, setLoading] = useState(true);
    const user = useContext(UserContext);
    const [redirectUrl, setRedirectUrl] = useState(false);
  

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
    if (!user) {
      
      window.location.href = "/register";
      setRedirectUrl("/register");
    } else {
      console.log("user in problem page: ", user);
    }
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
