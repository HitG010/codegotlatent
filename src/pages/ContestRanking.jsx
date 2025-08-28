import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  getContestUsers,
  fetchContestStartTime,
  getAllContestProblems,
} from "../api/api";
import { Link } from "react-router-dom";
import { Bug, ExternalLink } from "lucide-react";
import { avatars } from "../components/Avatars";

// Helper to format a duration (in minutes as float) to H:MM or Xm form
function formatMinutes(totalMinutes) {
  if (totalMinutes === null || totalMinutes === undefined || isNaN(totalMinutes)) return "N/A";
  const minutes = Math.floor(totalMinutes);
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (hours === 0) return `${rem}m`;
  return `${hours}h${rem.toString().padStart(2, "0")}m`;
}

const contestRanking = () => {
  const { contestId } = useParams();
  // console.log(contestId, "Contest ID in Contest Rating");
  // fetch the users in the contest using the contestId
  const [users, setUsers] = useState([]);
  const [startTime, setStartTime] = useState(new Date().getTime());
  const [problems, setProblems] = useState([]);
  useEffect(() => {
    const fetchUsers = async () => {
      const response = await getContestUsers(contestId);
      console.log(response, "Contest Users");
      setUsers(response);
    };
    fetchUsers();
    const fetchStartTime = async () => {
      const response = await fetchContestStartTime(contestId);
      console.log(response, "Contest Start Time");
      setStartTime(response);
    };
    fetchStartTime();
    const fetchProblems = async () => {
      const response = await getAllContestProblems(contestId);
      // console.log(response, "Contest Problems");
      setProblems(response);
    };
    fetchProblems();
    // console.log(users);
    // const fetchProblems = async () => {
    //   const response = await getAllContestProblems(contestId);
    //   // console.log(response, "Contest Problems");
    //   setProblems(response);
    // };
    // fetchProblems();
  }, [contestId]);

  // console.log(typeof startTime, "Start Time");
  // console.log(typeof users[0]?.finishTime, "Finish Time");

  // Helper function to calculate user statistics
  const calculateUserStats = (user) => {
    const solvedProblems =
      user.problems?.filter((p) => p.solvedInContest) || [];
    const totalPenalties =
      user.problems?.reduce((sum, p) => sum + (p.penalty || 0), 0) || 0;
    const totalScore =
      user.problems?.reduce((sum, p) => sum + (p.score || 0), 0) || 0;
    const finishDiffMins = user.finishTime
      ? (new Date(user.finishTime) - new Date(startTime)) / (60 * 1000)
      : null;
    return {
      solvedCount: solvedProblems.length,
      totalPenalties,
      totalScore,
      finishTime: finishDiffMins,
    };
  };

  // Precompute column template so it's stable between renders
  const gridTemplate = useMemo(
    () => `60px 160px 70px 120px ${problems.map(() => "120px").join(" ")}`,
    [problems]
  );

  return (
    <div className="w-full px-2 sm:px-4 md:px-8 lg:px-16">
      <div className="flex flex-col mt-8 sm:mt-12 min-h-screen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-semibold text-[#f1f3f5] tracking-tight">
              Contest Ranking
            </h1>
            <p className="text-white/40 text-sm mt-1">
              Live scoreboard • {users.length} participant{users.length!==1?"s":""} • {problems.length} problem{problems.length!==1?"s":""}
            </p>
          </div>
          <Link
            to={`/contest/${contestId}`}
            target="_blank"
            className="text-sm sm:text-base font-medium text-white/80 bg-gradient-to-r from-indigo-600/70 to-blue-600/70 hover:from-indigo-600 hover:to-blue-600 px-4 py-2 rounded-md flex gap-2 justify-center items-center shadow ring-1 ring-white/10 transition"
          >
            Go To Contest <ExternalLink className="w-4 h-4 text-white/80" />
          </Link>
        </div>

        {/* Table Wrapper */}
        <div className="bg-[#ffffff05] backdrop-blur-sm rounded-lg border border-[#ffffff15] overflow-x-auto w-full shadow-inner">
          {/* Table Header */}
          <div className="min-w-[680px] sticky top-0 z-10">
            <div
              className="grid gap-2 sm:gap-3 p-2 sm:p-3 text-white/70 font-semibold text-[11px] sm:text-xs uppercase tracking-wide bg-gradient-to-r from-[#ffffff08] to-[#ffffff05] border-b border-[#ffffff10]"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              <div className="text-center">Rank</div>
              <div className="text-left">Name</div>
              <div className="text-center">Score</div>
              <div className="text-center">Finish</div>
              {problems.map((problem, index) => (
                <div key={problem.id} className="text-center">
                  Q{index + 1}
                  <span className="block text-white/30 font-normal text-[10px] sm:text-[11px] -mt-0.5">
                    {problem.problemScore || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-[#ffffff10] min-w-[680px]">
            {users && users.length > 0 ? (
              users.map((user, index) => {
                const stats = calculateUserStats(user);
                const rankClass =
                  index === 0
                    ? "bg-gradient-to-r from-yellow-500/20 to-amber-500/10 ring-1 ring-amber-300/30"
                    : index === 1
                    ? "bg-gradient-to-r from-gray-300/15 to-gray-100/5 ring-1 ring-gray-200/20"
                    : index === 2
                    ? "bg-gradient-to-r from-amber-800/25 to-amber-900/10 ring-1 ring-amber-800/30"
                    : "";
                return (
                  <div
                    key={user.user.id}
                    className={`grid gap-2 sm:gap-3 p-2 sm:p-3 items-center hover:bg-[#ffffff07] transition-colors min-w-max`}
                    style={{ gridTemplateColumns: gridTemplate }}
                  >
                    {/* Rank */}
                    <div className="text-center">
                      <span className="text-sm sm:text-base font-semibold text-white/80">
                        {index + 1}
                      </span>
                    </div>

                    {/* Username */}
                    <div className="text-left">
                      <Link
                        to={`/user/${user.user.username}`}
                        target="_blank"
                        title={user.user.username}
                        className="group text-xs sm:text-sm font-semibold text-white hover:text-yellow-300 transition-colors duration-300 flex items-center gap-2 max-w-[150px] sm:max-w-[180px]"
                      >
                        <img
                          src={avatars[user.user.pfpId - 1]}
                          alt={user.user.username}
                          className="inline-block w-6 h-6 sm:w-7 sm:h-7 rounded-full ring-1 ring-white/10 group-hover:ring-yellow-300/40 transition"
                        />
                        <span className="truncate">
                          {user.user.username.length > 15
                            ? user.user.username.slice(0, 15) + "…"
                            : user.user.username}
                        </span>
                      </Link>
                    </div>

                    {/* Total Score */}
                    <div className="text-center">
                      <span className="text-xs sm:text-sm text-white bg-blue-500/20 border border-blue-400/30 rounded-full px-2 sm:px-3 py-0.5 font-medium">
                        {stats.totalScore}
                      </span>
                    </div>

                    {/* Finish Time */}
                    <div className="text-center">
                      <span className="text-[11px] sm:text-xs font-medium text-white/90 bg-white/5 rounded px-2 py-1 inline-block min-w-[54px]">
                        {formatMinutes(stats.finishTime)}
                      </span>
                    </div>

                    {/* Individual Problem Status */}
                    {problems.map((problem) => {
                      const userProblem = user.problems?.find(
                        (p) => p.problemId === problem.id
                      );
                      const isSolved = userProblem?.solvedInContest;
                      const hasPenalty = userProblem?.penalty > 0;
                      if (!userProblem || !isSolved) {
                        return (
                          <div key={problem.id} className="text-center">
                            <div className="text-white/25 text-[10px] sm:text-xs font-medium tracking-wide">
                              --
                            </div>
                          </div>
                        );
                      }
                      const timeTakenMins = userProblem.finishedAt
                        ? (new Date(userProblem.finishedAt) - new Date(startTime)) / (60 * 1000)
                        : null;
                      return (
                        <div key={problem.id} className="text-center">
                          <div className={`relative group py-1.5 px-2 sm:px-3 rounded-md text-[10px] sm:text-xs font-semibold flex flex-col gap-1 items-center justify-center border border-transparent ${hasPenalty ? "bg-red-500/15 border-red-400/20" : "bg-emerald-500/15 border-emerald-400/20"}`}>
                            <span className="text-white/90">
                              {formatMinutes(timeTakenMins)}
                            </span>
                            {hasPenalty && (
                              <span className="text-[10px] text-red-300 bg-red-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1 font-medium">
                                <Bug className="w-3 h-3" /> {userProblem.penalty}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            ) : (
              <div className="p-10 text-center text-white/60 col-span-full">
                <div className="text-sm sm:text-base font-medium">
                  No participants found for this contest
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contest Statistics */}
        {users && users.length > 0 && (
          <div className="mt-6 sm:mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#ffffff05] p-3 sm:p-4 rounded-lg border border-[#ffffff10]">
              <div className="text-white/60 text-xs sm:text-sm">
                Total Participants
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white">
                {users.length}
              </div>
            </div>
            <div className="bg-[#ffffff05] p-3 sm:p-4 rounded-lg border border-[#ffffff10]">
              <div className="text-white/60 text-xs sm:text-sm">
                Total Problems
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white">
                {problems.length}
              </div>
            </div>
            <div className="bg-[#ffffff05] p-3 sm:p-4 rounded-lg border border-[#ffffff10]">
              <div className="text-white/60 text-xs sm:text-sm">
                Average Score
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white">
                {users.length > 0
                  ? (
                      users.reduce(
                        (sum, user) =>
                          sum + calculateUserStats(user).totalScore,
                        0
                      ) / users.length
                    ).toFixed(1)
                  : "0"}
              </div>
            </div>
            <div className="bg-[#ffffff05] p-3 sm:p-4 rounded-lg border border-[#ffffff10]">
              <div className="text-white/60 text-xs sm:text-sm">
                Problems Solved
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white">
                {users.reduce(
                  (sum, user) => sum + calculateUserStats(user).solvedCount,
                  0
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default contestRanking;
