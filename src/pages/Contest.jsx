import { React } from "react";
import { useState, useEffect } from "react";
import {
  getContest,
  getIfUserRegistered,
  registerUser,
  unregisterUser,
} from "../api/api";
import { parseDate, calculateDuration } from "../utils/date";
import CountdownTimer from "../components/CountdownTimer";
import { Link, useParams } from "react-router-dom";
export default function Contest() {
  const [contest, setContest] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = "1"; // Replace with actual user ID
  const [isRegistered, setIsRegistered] = useState(false);
  const { contestId } = useParams();

  const handleClickRegister = async () => {
    if (isRegistered) {
      console.log("Already registered for the contest");
      return;
    }
    console.log("Registering for the contest:", contestId);
    const response = await registerUser(contestId, userId);
    isUserRegistered();
    console.log("Registering for contest:", contestId);
  };
  const handleClickUnregister = async () => {
    if (!isRegistered) {
      console.log("Not registered for the contest");
      return;
    }
    const response = await unregisterUser(contestId, userId);
    isUserRegistered();
    console.log("Unregistering from contest:", contestId);
  };

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
  const isUserRegistered = async () => {
    // Check if the user is registered for the contest
    const response = await getIfUserRegistered(contestId, userId);
    console.log("Response:", response);
    setIsRegistered(response.isRegistered);
  };
  useEffect(() => {
    fetchContest();
    isUserRegistered();
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
      {contest.status === "Upcoming" && !isRegistered && (
        <button onClick={handleClickRegister}>Register</button>
      )}
      {contest.status === "Upcoming" && isRegistered && (
        <div>
          <button onClick={handleClickUnregister}>Unregister</button>
          <p>You are registered for this contest</p>
          <CountdownTimer startTime={contest.startTime}></CountdownTimer>
        </div>
      )}
    </div>
  );
}
