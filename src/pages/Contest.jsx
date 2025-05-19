import { React } from "react";
import { useState, useEffect } from "react";
import {
  getContest,
  getIfUserRegistered,
  registerUser,
  unregisterUser,
  getAllContestProblems,
  submitRank,
} from "../api/api";
import { parseDate, calculateDuration } from "../utils/date";
import CountdownTimer from "../components/CountdownTimer";
import { Link, useParams } from "react-router-dom";
import io from "socket.io-client";
import useUserStore from "../store/userStore";

const socket = io(import.meta.env.VITE_BASE_URL, {
  path: "/socket.io",
});

socket.on("connect", () => {
  console.log("Connected to socket server");
});
socket.on("disconnect", () => {
  console.log("Disconnected from socket server");
});

export default function Contest() {
  const [contest, setContest] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useUserStore((state) => state.user);
  const userId = user.id;
  console.log(userId);
  const [predictedRank, setPredictedRank] = useState(0);
  // let isStarting2min = false;
  const [isStarting2min, setIsStarting2min] = useState(false);

  const [isRegistered, setIsRegistered] = useState(false);
  const [contestStatus, setContestStatus] = useState("Upcoming");
  const { contestId } = useParams();

  const [allProblems, setAllProblems] = useState([]);

  const fetchAllProblems = async () => {
    console.log("Fetching all problems for contest:", contestId);
    if (isRegistered && contest.status === "Ongoing") {
      try {
        const response = await getAllContestProblems(contestId);
        console.log("Contest Problems:", response);
        setAllProblems(response);
      } catch (error) {
        console.error("Error fetching contest problems:", error);
      }
    }
  };

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
  socket.on(
    "contestStarted",
    ({ contestId: startedContestId, updatedContest }) => {
      console.log("Contest started:", startedContestId);
      if (contestId === startedContestId) {
        setContestStatus("Ongoing");
        setContest(updatedContest);
        // fetchAllProblems();
        // ask for their predicted rank for the contest for the starting 2 minutes
        setIsStarting2min(true);
      }
    }
  );
  socket.on(
    "contestEnded",
    ({ contestId: startedContestId, updatedContest }) => {
      if (contestId === startedContestId) {
        setContestStatus("Ended");
        setContest(updatedContest);
      }
    }
  );
  socket.on(
    "2minEloped", 
    ({ contestId: startedContestId }) => {
      if (contestId === startedContestId) {
        // setContestStatus("Ongoing");
        // setContest(updatedContest);
        fetchAllProblems();
        // isStarting2min = false;
        setIsStarting2min(false);
      }
    }
  );
  useEffect(() => {
    console.log("Contest ID:", contestId);
    fetchContest();
    fetchAllProblems();
    isUserRegistered();
  }, [contestStatus]);

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
      {contest.status === "Ongoing" && isRegistered && (
        <div>
          <p>You are registered for this contest</p>
          <CountdownTimer startTime={contest.endTime}></CountdownTimer>
        </div>
      )}
      {contest.status === "Ended" && (
        <div>
          <p>The contest has ended</p>
        </div>
      )}
      {contest.status === "Ongoing" && isRegistered && (
        <div>
          <h2>Problems</h2>
          {allProblems.map((problem) => (
            <div key={problem.id}>
              <Link to={`/contest/${contestId}/problem/${problem.id}`}>
                <h3>{problem.title}</h3>
              </Link>
            </div>
          ))}
        </div>
      )}
      {/*card displaying number of current participants in the contest */}
      <div>
        <h2>Current Participants</h2>
        <p>{contest.currentParticipants}</p>
      </div>
      {/* {isRegistered && contest.status === "Ongoing" && (
        // dialog box to accept user's predicted ranking
        <div>
          <h2>Submit your predicted ranking</h2>
          <form>
            <label>
              Predicted Rank:
              <input type="number" name="predictedRank" value={predictedRank} onChange={
                (e) => setPredictedRank(e.target.value)
              }/>
            </label>
            <button type="submit" onClick={
              async (e) => {
                e.preventDefault();
                console.log("Submitting predicted rank:", predictedRank);
                const response = await submitRank(
                  contestId,
                  userId,
                  predictedRank
                );
                console.log("Response:", response);
                // setPredictedRank(null);
              }
            }>Submit</button>
          </form>
        </div>
      )} */}
      {isRegistered && isStarting2min && (
        <div>
          <h2>Contest is starting in 2 minutes</h2>
          <p>Please submit your predicted rank for the contest</p>
          <form>
            <label>
              Predicted Rank:
              <input
                type="number"
                name="predictedRank"
                value={predictedRank}
                onChange={(e) => setPredictedRank(e.target.value)}
              />
            </label>
            <button
              type="submit"
              onClick={async (e) => {
                e.preventDefault();
                console.log("Submitting predicted rank:", predictedRank);
                const response = await submitRank(
                  contestId,
                  userId,
                  predictedRank
                );
                console.log("Response:", response);
                // setPredictedRank(null);
              }}
            >
              Submit
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
