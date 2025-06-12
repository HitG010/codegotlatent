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
import { Check, Clock, Info } from "lucide-react";
import { GoStopwatch } from "react-icons/go";
import cglContest from "../assets/cglContest.png";
import DifficultyTag from "../components/DifficultyTag";

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
  const [showInfo, setShowInfo] = useState(false);

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
    <div className="flex flex-row rounded-lg text-white max-w-280 my-auto p-6 mx-auto gap-12">
      {/* <h1>Contest</h1> */}
      <div className="h-full flex flex-col rounded-lg bg-[#212121] p-4 border border-[#ffffff10] w-full">
      <img src={cglContest} alt="CGL Contest" className="rounded-lg mb-4" />
      <div className="flex flex-row items-center gap-4 mb-2">
        <h2 className="text-4xl font-semibold">{contest.name}</h2>
        <h3 className="rounded-full bg-green-500/10 text-green-500 border border-1 border-[#ffffff15] text-sm px-3 py-1">{contestStatus}</h3>
      </div>
      <p className="text-white/65 mb-2">{contest.description}</p>
      <div className="flex flex-row items-center gap-2 mb-2">
        <p className="rounded-md px-4 py-2 bg-[#ffffff10] w-fit flex justify-center items-center gap-2 text-white/65"><Clock className="h-4 w-4"/> {parseDate(contest.startTime)}</p>
        {/* <p>End Time: {parseDate(contest.endTime)}</p> */}
        <p className="rounded-md px-4 py-2 bg-[#ffffff10] w-fit flex justify-center items-center gap-2 text-white/65"><GoStopwatch /> {calculateDuration(contest.startTime, contest.endTime)}</p>
      </div>
      {contest.status === "Upcoming" && !isRegistered && (
        <button onClick={handleClickRegister} 
        className="flex justify-center items-center w-full gap-2 bg-white text-black hover:bg-white/90 rounded-md px-2 py-1.5 font-medium cursor-pointer">Register</button>
      )}
      {contest.status === "Upcoming" && isRegistered && (
        <div>
          <button onClick={handleClickUnregister}
          className="flex justify-center items-center w-full gap-2 bg-white text-black hover:bg-white/90 rounded-md px-2 py-1.5 font-medium cursor-pointer">Unregister</button>
          <button className="flex justify-center items-center w-full gap-2 bg-white text-black hover:bg-white/90 rounded-md px-2 py-1.5 font-medium cursor-pointer"><Check/> Registered</button>
          Rank Guess Starts in: <CountdownTimer startTime={contest.startTime}></CountdownTimer>
        </div>
      )}
      {contest.status === "Ongoing" && isRegistered && (
        <div>
          <button className="flex justify-center items-center w-full gap-2 bg-white text-black hover:bg-white/90 rounded-md px-2 py-1.5 font-medium cursor-pointer disabled:bg-white/65 disabled:cursor-not-allowed" disabled={true}><Check className="w-4 h-4"/> Registered</button>
          <div className="flex gap-2 items-center mt-2">Contest Ends in: <CountdownTimer startTime={contest.endTime}></CountdownTimer></div>
        </div>
      )}
      {contest.status === "Ended" && (
        <div>
          <p>The contest has ended</p>
        </div>
      )}
      
      {/*card displaying number of current participants in the contest */}
      <div className="flex gap-2 items-center mt-4">
        <h2 className="text-white/65">Current Participants</h2>
        <p className="rounded-md px-2 py-0.5 bg-[#ffffff10] w-fit flex justify-center items-center gap-2 text-white font-semibold">{contest?.currentParticipants || 0}</p>
      </div>
      {isRegistered && isStarting2min && (
        <div>
          <h2 className="text-lg font-semibold">Contest is starting in <CountdownTimer startTime={contest.startTime + 2*60*100}></CountdownTimer></h2>
          <p className="text-lg font-semibold">Please submit your predicted rank for the contest</p>
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
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition duration-200"
            >
              Submit
            </button>
          </form>
        </div>
      )}
      {isRegistered && !isStarting2min && (
        <div className="border border-1 border-yellow-500/45 rounded-lg p-4 bg-[#ffffff10] mt-2">
          <h2 className="text-lg font-semibold">Guess Your Rank</h2>
          {/* Contest is starting in <CountdownTimer startTime={contest.startTime + 2*60*100}></CountdownTimer> */}
          <form className="flex flex-col gap-2 w-full">
            <label className="flex flex-col justify-center gap-2 w-full">
              <div className="flex justify-between items-center">
                <p>Your Predicted Rank:</p>
                <div className="flex items-center gap-1">
                  <div className="cursor-pointer" onMouseEnter={() => setShowInfo(true)}
                  onMouseLeave={() => setShowInfo(false)}>
                  <Info className="inline h-4 w-4 text-yellow-500"
                  />
                  </div>
                  {showInfo && (
                    <span className="absolute -translate-y-[40px] -translate-x-1/2 mt-2 w-64 bg-black text-white text-xs rounded-lg shadow-lg p-2 z-10">
                      This is your predicted rank for the contest. It will be used to calculate your score.
                    </span>
                  )}
                </div>
              </div>
              <input
                type="number"
                name="predictedRank"
                value={predictedRank}
                disabled={true}
                // onChange={(e) => setPredictedRank(e.target.value)}
                className="disabled:cursor-not-allowed border border-1 border-[#ffffff25] rounded px-2 py-1 w-full block bg-[#ffffff10] text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 transition duration-200"
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
              disabled = {true}
              className="flex justify-center items-center w-full gap-2 bg-white text-black hover:bg-white/90 rounded-md px-2 py-1.5 font-medium cursor-pointer disabled:bg-white/65 disabled:cursor-not-allowed"
            >
              Submit
            </button>
          </form>
        </div>
      )}
      </div>
      {contest.status === "Ongoing" && isRegistered && (
        <div className=" flex flex-col gap-4 w-full">
          <h2 className="text-4xl font-semibold mb-2 inline-block">Problems</h2>
          <div className="flex flex-col gap-0.5 w-full">
            {allProblems.map((problem) => (
            <div key={problem.id}>
              <Link to={`/contest/${contestId}/problem/${problem.id}`}
              className="text-lg font-semibold text-white hover:text-yellow-500 transition duration-200 bg-[#ffffff05] rounded-md px-4 py-2 mb-2 hover:bg-[#ffffff10] border border-1 border-[#ffffff15] flex justify-between items-center w-full">
                <div className="flex items-center justify-between gap-4 w-full">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4">
                      {problem.solvedInContest ? <Check className="h-4 w-4 text-green-500" /> : ""}
                      </div>
                    <h3>{problem.title}</h3>
                  </div>
                  {/* <DifficultyTag className="text-sm text-[#ffffff80]" tag={problem.difficulty}/> */}
                  <span className="text-sm text-[#ffffff80] rounded-full px-3 py-0.5 bg-[#ffffff10]">{problem.problemScore}</span>
                </div>
              </Link>
            </div>
          ))}
          </div>
        <div className="flex flex-col gap-2">
          {/* <h2 className="text-4xl font-semibold mb-2">Contest Details</h2> */}
          {/* <p className="text-white/65">{contest.details}</p> */}
          <div className="flex flex-col gap-2">
            <h3 className="text-2xl font-semibold">Contest Rules</h3>
            <ul className="list-disc pl-5 text-white/65">
              {contest.rules && contest.rules.map((rule, index) => (
                <li key={index}>{rule}</li>
              ))}
            </ul>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
