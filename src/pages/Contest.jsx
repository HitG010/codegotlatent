import { React } from "react";
import { useState, useEffect } from "react";
import {
  getContest,
  getIfUserRegistered,
  registerUser,
  unregisterUser,
} from "../api/api";
import { parseDate, calculateDuration } from "../utils/date";
import { UserContext } from "../providers/userProvider";
import { useContext } from "react";
import CountdownTimer from "../components/CountdownTimer";
import { Link, useParams } from "react-router-dom";
import io from "socket.io-client";

const socket = io(import.meta.env.VITE_BASE_URL, {
  path: "/socket.io",
  
});

socket.on("connect", () => {
  console.log("Connected to socket server");
});
socket.on("disconnect", () => {
  console.log("Disconnected from socket server");
});
const userId = '1';

export default function Contest() {
  const [contest, setContest] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useContext(UserContext);
  const [redirectUrl, setRedirectUrl] = useState(false);

  const [isRegistered, setIsRegistered] = useState(false);
  const [contestStatus, setContestStatus] = useState("Upcoming");
  const { contestId } = useParams();

  const handleClickRegister = async () => {
    if (isRegistered) {
      console.log("Already registered for the contest");
      return;
    }
    console.log("Registering for the contest:", contestId);
    // console.log("User UUID:", user.uuid);
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
      setContestStatus(response.status);
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
    if (!user) {
      window.location.href = "/register";
      setRedirectUrl("/register");
    } else {
      console.log("user in contest page: ", user);
    }

    socket.on("contestStarted", ({ contestId: startedContestId }) => {
      console.log("Contest started:", startedContestId);
      if (contestId === startedContestId) {
        setContestStatus("Started");
      }
    });
    socket.on("contestEnded", ({ contestId: startedContestId }) => {
      if (contestId === startedContestId) {
        setContestStatus("Ended");
      }
    });
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
      <h3>{contestStatus}</h3>
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
