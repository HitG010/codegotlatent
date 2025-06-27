import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getContestUsers, fetchContestStartTime, getAllContestProblems } from "../api/api";
import { Link } from "react-router-dom";
import { Bug, ExternalLink } from "lucide-react";
import { avatars } from "../components/Avatars";

const contestRanking = () => {
  const { contestId } = useParams();
  console.log(contestId, "Contest ID in Contest Rating");
  // fetch the users in the contest using the contestId
  const [users, setUsers] = useState([]);
  const [startTime, setStartTime] = useState(new Date().getTime());
  const [problems, setProblems] = useState([]);
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
      console.log(response, "Contest Problems");
      setProblems(response);
    };
    fetchProblems();
    const fetchProblems = async () => {
      const response = await getAllContestProblems(contestId);
      console.log(response, "Contest Problems");
      setProblems(response);
    };
    fetchProblems();
  }, [contestId]);

  console.log(typeof startTime, "Start Time");
  console.log(typeof users[0]?.finishTime, "Finish Time");

  // Helper function to calculate user statistics
  const calculateUserStats = (user) => {
    const solvedProblems = user.problems?.filter(p => p.solvedInContest) || [];
    const totalPenalties = user.problems?.reduce((sum, p) => sum + (p.penalty || 0), 0) || 0;
    const totalScore = user.problems?.reduce((sum, p) => sum + (p.score || 0), 0) || 0;
    
    return {
      solvedCount: solvedProblems.length,
      totalPenalties,
      totalScore,
      finishTime: user.finishTime ? 
        ((new Date(user.finishTime) - new Date(startTime)) / (60 * 1000)).toFixed(2) : 
        'N/A'
    };
  };

  return (
    <div>
      <div className="flex flex-col mt-12 h-screen mx-16">
        <div className="flex flex-row items-center justify-between mb-8">
          <h1 className="text-4xl font-semibold text-[#f1f3f5]">
            Contest Ranking
          </h1>
          <Link
            to={`/contest/${contestId}`}
            target="_blank"
            className="text-md font-medium text-white/65 bg-[#ffffff10] px-3 py-1 rounded-md flex gap-2 justify-center items-center hover:bg-[#ffffff15] hover:text-white transition-all duration-300"
          >
            Go To Contest <ExternalLink className="w-4 h-4 text-white/65" />
          </Link>
        </div>

        {/* Contest Ranking Table */}
        <div className="bg-[#ffffff05] rounded-lg border border-[#ffffff10] overflow-hidden overflow-x-auto">
          {/* Table Header */}
          <div className="">
            <div className="grid gap-4 p-4 text-white/65 font-medium text-sm min-w-max" style={{
              gridTemplateColumns: `60px 350px 80px 200px ${problems.map(() => '120px').join(' ')}`
            }}>
              <div className="text-center">Rank</div>
              <div className="text-left">Name</div>
              <div className="text-center">Score</div>
              <div className="text-center">Finish Time</div>
              {problems.map((problem, index) => (
                <div key={problem.id} className="text-center">
                  Q{index + 1} ({problem.problemScore || 0})
                </div>
              ))}
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-[#ffffff10]">
            {users && users.length > 0 ? (
              users.map((user, index) => {
                const stats = calculateUserStats(user);
                return (
                  <div key={user.user.id} className="grid gap-4 p-4 items-center hover:bg-[#ffffff08] transition-colors min-w-max" style={{
                    gridTemplateColumns: `60px 350px 80px 200px ${problems.map(() => '120px').join(' ')}`
                  }}>
                    {/* Rank */}
                    <div className="text-center">
                      <span className={"text-lg text-white/65" + (index === 0 ? " text-yellow-300 font-bold" : "") + (index === 1 ? " text-white/90 font-bold" : "") + (index === 2 ? " text-yellow-700 font-bold" : "")} >
                        {index + 1}
                      </span>
                    </div>

                    {/* Username */}
                    <div className="text-left">
                      <Link
                        to={`/user/${user.user.username}`} target="_blank"
                        className="text-lg font-semibold text-white hover:text-yellow-300 transition-colors duration-300 flex items-center gap-2"
                      >
                        <img src={avatars[user.user.pfpId - 1]} alt={user.user.username} className="inline-block w-7 h-7 rounded-full" />
                        {user.user.username}
                      </Link>
                    </div>

                    {/* Total Score */}
                    <div className="text-center">
                      <span className="text-md text-white bg-white/5 rounded-full px-3 py-0.5">
                        {stats.totalScore}
                      </span>
                    </div>

                    {/* Finish Time */}
                    <div className="text-center">
                      <span className="text-sm font-medium text-white">
                        {stats.finishTime !== 'N/A' ? `${stats.finishTime}` : 'N/A'}
                      </span>
                    </div>

                    {/* Individual Problem Status */}
                    {problems.map((problem, problemIndex) => {
                      const userProblem = user.problems?.find(p => p.problemId === problem.id);
                      const isSolved = userProblem?.solvedInContest;
                      const hasPenalty = userProblem?.penalty > 0;
                      
                      if (!userProblem || !isSolved) {
                        // User didn't attempt this problem
                        return (
                          <div key={problem.id} className="text-center">
                            <div className="text-white/40 text-sm">--</div>
                          </div>
                        );
                      }

                      // Calculate time taken for this problem
                      const timeTaken = userProblem.finishedAt ? 
                        ((new Date(userProblem.finishedAt) - new Date(startTime)) / (60 * 1000)).toFixed(0) : 
                        'N/A';

                      return (
                        <div key={problem.id} className="text-center">
                          <div className={`
                            py-1 px-3 rounded text-sm font-medium flex gap-2 items-center justify-center rounded-md bg-white/3
                          `}>
                            <div className="flex items-center justify-center gap-1">
                              <span>{timeTaken !== 'N/A' ? `${timeTaken}:00` : 'N/A'}</span>
                            </div>
                            {hasPenalty && (
                              <div className="text-xs text-red-500 bg-red-500/20 px-2 py-0.5 mb-1 rounded-full flex gap-1 items-center justify-center mt-1">
                                <Bug className="w-4 h-4 inline-block" /> {userProblem.penalty}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-white/60 col-span-full">
                <div className="text-lg">No participants found for this contest</div>
              </div>
            )}
          </div>
        </div>

        {/* Contest Statistics */}
        {users && users.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#ffffff05] p-4 rounded-lg border border-[#ffffff10]">
              <div className="text-white/60 text-sm">Total Participants</div>
              <div className="text-2xl font-bold text-white">{users.length}</div>
            </div>
            <div className="bg-[#ffffff05] p-4 rounded-lg border border-[#ffffff10]">
              <div className="text-white/60 text-sm">Total Problems</div>
              <div className="text-2xl font-bold text-white">{problems.length}</div>
            </div>
            <div className="bg-[#ffffff05] p-4 rounded-lg border border-[#ffffff10]">
              <div className="text-white/60 text-sm">Average Score</div>
              <div className="text-2xl font-bold text-white">
                {users.length > 0 ? 
                  (users.reduce((sum, user) => sum + calculateUserStats(user).totalScore, 0) / users.length).toFixed(1) : 
                  '0'
                }
              </div>
            </div>
            <div className="bg-[#ffffff05] p-4 rounded-lg border border-[#ffffff10]">
              <div className="text-white/60 text-sm">Problems Solved</div>
              <div className="text-2xl font-bold text-white">
                {users.reduce((sum, user) => sum + calculateUserStats(user).solvedCount, 0)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default contestRanking;
