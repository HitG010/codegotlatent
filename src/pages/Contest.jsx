import { React } from "react";
import { useState, useEffect } from "react";
import {
  getContest,
  getIfUserRegistered,
  registerUser,
  unregisterUser,
  getAllContestProblems,
  submitRank,
  getContestParticipants,
  getUserRankGuess,
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
import ContestNavbar from "../components/ContestNavbar";
import { FaArrowLeftLong } from "react-icons/fa6";
import ContestDescription from "../components/ContestDescription";
import AccordionSection from "../components/AccordionSection";
import { Loader2 } from "lucide-react";
import GradientBlobsBackground from "../components/GradientBlobsBackground";

const socket = io(import.meta.env.VITE_BASE_URL, {
  path: "/socket.io",
});

socket.on("connect", () => {
  // console.log("Connected to socket server");
});
socket.on("disconnect", () => {
  // console.log("Disconnected from socket server");
});

export default function Contest() {
  const [contest, setContest] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useUserStore((state) => state.user);
  const userId = user.id;
  // console.log(userId);
  const [predictedRank, setPredictedRank] = useState(0);
  const [totalParticipants, setTotalParticipants] = useState(0);
  // const [isStarting2min, setIsStarting2min] = useState(false);

  const [isRegistered, setIsRegistered] = useState(false);
  const [contestStatus, setContestStatus] = useState("Upcoming");
  const { contestId } = useParams();

  const [allProblems, setAllProblems] = useState([]);
  const [showInfo, setShowInfo] = useState(false);

  const fetchAllProblems = async () => {
    // console.log("Fetching all problems for contest:", contestId);

    try {
      const response = await getAllContestProblems(contestId, userId);
      // console.log("Contest Problems:", response);
      setAllProblems(response);
    } catch (error) {
      console.error("Error fetching contest problems:", error);
    }
  };

  const fetchTotalParticipants = async () => {
    try {
      const response = await getContestParticipants(contestId);
      // console.log("Total Participants:", response);
      setTotalParticipants(response.participantsCount);
    } catch (error) {
      console.error("Error fetching total participants:", error);
    }
  };

  const handleClickRegister = async () => {
    if (isRegistered) {
      // console.log("Already registered for the contest");
      return;
    }
    // console.log("Registering for the contest:", contestId);
    // // console.log("User UUID:", user.uuid);
    const response = await registerUser(contestId, userId);
    isUserRegistered();
    // console.log("Registering for contest:", contestId);
  };
  const handleClickUnregister = async () => {
    if (!isRegistered) {
      // console.log("Not registered for the contest");
      return;
    }
    const response = await unregisterUser(contestId, userId);
    isUserRegistered();
    // console.log("Unregistering from contest:", contestId);
  };

  const fetchContest = async () => {
    try {
      const response = await getContest(contestId);
      //   // console.log("Response:", response);
      setContest(response);
      setContestStatus(response.status);
      fetchTotalParticipants();
    } catch (error) {
      console.error("Error fetching contest:", error);
    } finally {
      setLoading(false);
    }
  };
  // fetchContest(); // initial fetch of contest data

  const isUserRegistered = async () => {
    // Check if the user is registered for the contest
    const response = await getIfUserRegistered(contestId, userId);
    // console.log("Response:", response);
    setIsRegistered(response.isRegistered);
  };

  const fetchUserRankGuess = async () => {
    try {
      const response = await getUserRankGuess(contestId, userId);
      // console.log("User Rank Guess:", response);
      setPredictedRank(response.rankGuess == null ? 0 : response.rankGuess);
    } catch (error) {
      console.error("Error fetching user rank guess:", error);
    }
  };

  // webhook listeners for contest events
  // Contest Rank Guess Phase Started Webhook
  socket.on(
    "contestRankGuessPhaseStarted",
    async ({ contestId: startedContestId, updatedContest }) => {
      // console.log("Contest started:", startedContestId);
      if (contestId === startedContestId) {
        setContestStatus("Rank Guess Phase");
        setContest(updatedContest);
        await fetchTotalParticipants();
        // fetchAllProblems();
        // ask for their predicted rank for the contest for the starting 2 minutes
        // setIsStarting2min(true);
      }
    }
  );

  // Contest Ended Webhook
  socket.on(
    "contestEnded",
    ({ contestId: startedContestId, updatedContest }) => {
      if (contestId === startedContestId) {
        setContestStatus("Ended");
        setContest(updatedContest);
      }
    }
  );

  // Rank Guess Phase Ended Webhook
  socket.on(
    "contestStarted",
    async ({ contestId: startedContestId, updatedContest }) => {
      if (contestId === startedContestId) {
        // setContestStatus("Ongoing");
        // setContest(updatedContest);
        await fetchAllProblems();
        // isStarting2min = false;
        // setIsStarting2min(false);
        setContestStatus("Ongoing");
      }
    }
  );

  // Contest Rating Update Phase Started Webhook
  socket.on(
    "contestRatingPending",
    ({ contestId: startedContestId, updatedContest }) => {
      if (contestId === startedContestId) {
        setContestStatus("System Testing");
        setContest(updatedContest);
        // fetchAllProblems();
        // fetchTotalParticipants();
        // setIsStarting2min(false);
        // setIsStarting2min(false);
      }
    }
  );

  useEffect(() => {
    // console.log("Contest ID:", contestId);
    fetchContest();
    // setContestStatus(contest.status);
    fetchAllProblems();
    isUserRegistered();
    fetchUserRankGuess();
  }, [contestStatus]);

  if (loading) {
    return (
      <div className="text-base lg:text-lg text-white/65 flex items-center gap-2 justify-center w-full overflow-y-auto h-screen">
        <Loader2 className="animate-spin" /> Loading...
      </div>
    );
  }

  return (
    <>
      <GradientBlobsBackground />
      <div className="flex flex-col lg:flex-row rounded-lg text-white max-w-full lg:max-w-280 my-auto p-4 lg:p-6 mx-auto gap-6 lg:gap-12 scrollbar overflow-y-auto">
        {/* <ContestNavbar /> */}
        <div className="h-full flex flex-col rounded-xl bg-white/3 border border-white/10 backdrop-blur-lg p-4 border-[#ffffff10] w-full lg:w-[420px] xl:w-[480px] 2xl:w-[520px] flex-shrink-0 overflow-y-auto scrollbar">
          <Link
            to={`/contests`}
            className="flex gap-2 items-center text-sm text-white/65 px-3 py-1 mb-1 hover:bg-white/10 transition-all duration-300 w-fit rounded rounded-lg"
          >
            {" "}
            <FaArrowLeftLong className="w-3 h-3" /> Contests{" "}
          </Link>
          <img src={cglContest} alt="CGL Contest" className="rounded-lg mb-4" />
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-4 mb-2">
            <h2 className="text-2xl lg:text-4xl font-semibold">
              {contest?.name}
            </h2>
            <h3 className="rounded-full bg-white/5 text-white/65 border-1 border-[#ffffff15] text-sm px-3 py-1 w-fit">
              {contestStatus}
            </h3>
          </div>
          <div></div>
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 mb-2 scrollbar">
            <p className="rounded-md px-3 lg:px-4 py-1.5 lg:py-2 bg-[#ffffff10] w-fit flex justify-center items-center gap-2 text-white/65 text-sm lg:text-base">
              <Clock className="h-3 w-3 lg:h-4 lg:w-4" />{" "}
              {parseDate(contest?.startTime)}
            </p>
            <p className="rounded-md px-3 lg:px-4 py-1.5 lg:py-2 bg-[#ffffff10] w-fit flex justify-center items-center gap-2 text-white/65 text-sm lg:text-base">
              <GoStopwatch className="h-3 w-3 lg:h-4 lg:w-4" />{" "}
              {calculateDuration(contest?.startTime, contest?.endTime)}
            </p>
          </div>
          {contest?.status === "Upcoming" && !isRegistered && (
            <button
              onClick={handleClickRegister}
              className="flex justify-center items-center w-full gap-2 bg-white text-black hover:bg-white/90 rounded-md px-2 py-1.5 font-medium cursor-pointer"
            >
              Register
            </button>
          )}
          {contest?.status === "Upcoming" && isRegistered && (
            <div>
              <button
                onClick={handleClickUnregister}
                className="flex justify-center items-center w-full gap-2 bg-white text-black hover:bg-white/90 rounded-md px-2 py-1.5 font-medium cursor-pointer"
              >
                <Check /> Registered
              </button>
              {/* <button className="flex justify-center items-center w-full gap-2 bg-white text-black hover:bg-white/90 rounded-md px-2 py-1.5 font-medium cursor-pointer">
              <Check /> Registered
            </button> */}
              {/* <Rank Guess Starts in: <CountdownTimer startTime={contest.startTime}></CountdownTimer> */}
              {contest?.status === "Upcoming" && (
                <div className="flex gap-2 items-center mt-2">
                  Rank Guess Phase Starts in:{" "}
                  <CountdownTimer
                    startTime={contest?.rankGuessStartTime}
                  ></CountdownTimer>
                </div>
              )}
            </div>
          )}
          {contest?.status === "Rank Guess Phase" && (
            <div className="flex gap-2 items-center mt-2">
              Contest Starts in:{" "}
              <CountdownTimer startTime={contest?.startTime}></CountdownTimer>
            </div>
          )}
          {contest?.status !== "Upcoming" &&
            contest?.status !== "Rank Guess Phase" &&
            isRegistered && (
              <div>
                <button
                  className="flex justify-center items-center w-full gap-2 bg-white text-black hover:bg-white/90 rounded-md px-2 py-1.5 font-medium cursor-pointer disabled:bg-white/65 disabled:cursor-not-allowed"
                  disabled={true}
                >
                  <Check className="w-4 h-4" /> Registered
                </button>
                {contest?.status === "Ongoing" && (
                  <div className="flex gap-2 items-center mt-2">
                    Contest Ends in:{" "}
                    <CountdownTimer
                      startTime={contest?.endTime}
                    ></CountdownTimer>
                  </div>
                )}
              </div>
            )}
          {contest?.status === "Rating Update Pending" && (
            <div>
              <p>The contest has ended. Rating Update is in progress.</p>
            </div>
          )}
          {contest?.status === "Ongoing" && !isRegistered && (
            <button
              disabled={true}
              className="flex justify-center items-center w-full gap-2 bg-white text-black hover:bg-white/90 rounded-md px-2 py-1.5 font-medium cursor-pointer"
            >
              Register
            </button>
          )}

          {/*card displaying number of current participants in the contest */}
          <div className="flex gap-2 items-center mt-4">
            <h2 className="text-white/65">Current Participants</h2>
            <p className="rounded-md px-2 py-0.5 bg-[#ffffff10] w-fit flex justify-center items-center gap-2 text-white font-semibold">
              {totalParticipants}
            </p>
          </div>
          {isRegistered && contest?.status === "Rank Guess Phase" && (
            <div className="border-1 border-yellow-500/45 rounded-lg p-4 bg-[#ffffff10] mt-2">
              <h2 className="text-lg font-semibold">Guess Your Rank</h2>
              {/* Contest is starting in <CountdownTimer startTime={contest.startTime + 2*60*100}></CountdownTimer> */}
              <form className="flex flex-col gap-2 w-full">
                <label className="flex flex-col justify-center gap-2 w-full">
                  <div className="flex justify-between items-center">
                    <p>Your Predicted Rank:</p>
                    <div className="flex items-center gap-1">
                      <div
                        className="cursor-pointer"
                        onMouseEnter={() => setShowInfo(true)}
                        onMouseLeave={() => setShowInfo(false)}
                      >
                        <Info className="inline h-4 w-4 text-yellow-500" />
                      </div>
                      {showInfo && (
                        <span className="absolute -translate-y-[40px] -translate-x-1/2 mt-2 w-64 bg-black text-white text-xs rounded-lg shadow-lg p-2 z-10">
                          This is your predicted rank for the contest. It will
                          be used to calculate your score.
                        </span>
                      )}
                    </div>
                  </div>
                  <input
                    type="number"
                    name="predictedRank"
                    value={predictedRank}
                    onChange={(e) => setPredictedRank(e.target.value)}
                    className="border-1 border-[#ffffff25] rounded px-2 py-1 w-full block bg-[#ffffff10] text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 transition duration-200"
                  />
                </label>
                <button
                  type="submit"
                  onClick={async (e) => {
                    e.preventDefault();
                    // console.log("Submitting predicted rank:", predictedRank);
                    const response = await submitRank(
                      contestId,
                      userId,
                      predictedRank
                    );
                    // setPredictedRank()
                    // console.log("Response:", response);
                    // setPredictedRank(null);
                  }}
                  className="flex justify-center items-center w-full gap-2 bg-white text-black hover:bg-white/90 rounded-md px-2 py-1.5 font-medium cursor-pointer"
                >
                  Submit
                </button>
              </form>
            </div>
          )}
          {isRegistered && contest?.status !== "Rank Guess Phase" && (
            <div className="border-1 border-yellow-500/45 rounded-lg p-4 bg-[#ffffff10] mt-2">
              <h2 className="text-lg font-semibold">Guess Your Rank</h2>
              {/* Contest is starting in <CountdownTimer startTime={contest.startTime + 2*60*100}></CountdownTimer> */}
              <form className="flex flex-col gap-2 w-full">
                <label className="flex flex-col justify-center gap-2 w-full">
                  <div className="flex justify-between items-center">
                    <p>Your Predicted Rank:</p>
                    <div className="flex items-center gap-1">
                      <div
                        className="cursor-pointer"
                        onMouseEnter={() => setShowInfo(true)}
                        onMouseLeave={() => setShowInfo(false)}
                      >
                        <Info className="inline h-4 w-4 text-yellow-500" />
                      </div>
                      {showInfo && (
                        <span className="absolute -translate-y-[40px] -translate-x-1/2 mt-2 w-64 bg-black text-white text-xs rounded-lg shadow-lg p-2 z-10">
                          This is your predicted rank for the contest. It will
                          be used to calculate your score.
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
                    className="disabled:cursor-not-allowed border-1 border-[#ffffff25] rounded px-2 py-1 w-full block bg-[#ffffff10] text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 transition duration-200"
                  />
                </label>
                <button
                  type="submit"
                  onClick={async (e) => {
                    e.preventDefault();
                    // console.log("Submitting predicted rank:", predictedRank);
                    const response = await submitRank(
                      contestId,
                      userId,
                      predictedRank
                    );
                    // console.log("Response:", response);
                    // setPredictedRank(null);
                  }}
                  disabled={true}
                  className="flex justify-center items-center w-full gap-2 bg-white text-black hover:bg-white/90 rounded-md px-2 py-1.5 font-medium cursor-pointer disabled:bg-white/65 disabled:cursor-not-allowed"
                >
                  Submit
                </button>
              </form>
            </div>
          )}
        </div>
        {
          <div className="flex flex-col gap-4 w-full lg:flex-1">
            <h2 className="text-lg lg:text-2xl font-semibold mb-2 inline-block">
              Problems
            </h2>
            <div className="flex flex-col gap-0.5 w-full">
              {allProblems.length === 0 && (
                <div className="h-24 w-full flex items-center justify-center text-white/65">
                  {" "}
                  Problems for this contest will appear here{" "}
                </div>
              )}
              {allProblems.map((problem) => (
                <div key={problem.id}>
                  <Link
                    to={`/contest/${contestId}/problem/${problem.id}`}
                    className="text-base lg:text-lg font-semibold text-white hover:text-yellow-500 transition duration-200 bg-[#ffffff05] rounded-md px-3 lg:px-4 py-2 mb-2 hover:bg-[#ffffff10] border-1 border-[#ffffff15] flex justify-between items-center w-full"
                  >
                    <div className="flex items-center justify-between gap-2 lg:gap-4 w-full">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="h-4 w-4 flex-shrink-0">
                          {problem.solvedInContest ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            ""
                          )}
                        </div>
                        <h3 className="truncate">{problem.title}</h3>
                      </div>
                      <span className="text-xs lg:text-sm text-[#ffffff80] rounded-full px-2 lg:px-3 py-0.5 bg-[#ffffff10] flex-shrink-0">
                        {problem.problemScore}
                      </span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
            {allProblems && (
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-start gap-2 lg:gap-4 mt-4">
                <p className="text-white/65 text-sm lg:text-base">
                  Total Score:{" "}
                  <span className="px-2 lg:px-3 py-1 rounded-md bg-[#ffffff10] font-semibold text-white ml-1">
                    {allProblems.reduce(
                      (acc, problem) =>
                        acc +
                        (problem.solvedInContest ? problem.problemScore : 0),
                      0
                    )}
                  </span>
                </p>
                <p className="text-white/65 text-sm lg:text-base">
                  Total Penalties:{" "}
                  <span className="px-2 lg:px-3 py-1 rounded-md bg-[#ffffff10] font-semibold text-white ml-1">
                    {allProblems.reduce(
                      (acc, problem) =>
                        acc + (problem.solvedInContest ? problem.penalty : 0),
                      0
                    )}
                  </span>
                </p>
              </div>
            )}
            {contest?.status === "Ended" && (
              <div className="bg-[#ffffff05] rounded-lg p-4 mt-4 border-1 border-[#ffffff10]">
                <h2 className="text-xl lg:text-2xl font-semibold mb-2">
                  Contest Rankings
                </h2>
                <p className="text-white/65 text-sm lg:text-base">
                  The contest has ended. You can view your results and ratings
                  by visiting the rankings page.
                </p>
                <Link
                  to={`/contest/${contestId}/ranking`}
                  className="text-black bg-white rounded-md font-medium px-3 py-2 text-center hover:bg-white/65 transition-all duration-300 mt-2 inline-block w-full text-sm lg:text-base"
                >
                  View Rankings
                </Link>
              </div>
            )}
            <div className="h-0.5 bg-white/5 rounded-md my-4 w-full" />
            <div className="flex flex-col gap-2">
              <AccordionSection title="Contest Description" defaultOpen={true}>
                <ContestDescription description={contest?.description} />
              </AccordionSection>
              <AccordionSection title="Rules" defaultOpen={true}>
                <ContestDescription description={contest?.rules} />
              </AccordionSection>
            </div>
          </div>
        }
      </div>
    </>
  );
}
