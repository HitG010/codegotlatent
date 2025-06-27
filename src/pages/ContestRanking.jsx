import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  getContestUsers,
  fetchContestStartTime,
  getAllContestProblems,
} from "../api/api";
import { Link } from "react-router-dom";
import { Bug, ExternalLink } from "lucide-react";

const contestRanking = () => {
  const { contestId } = useParams();
  console.log(contestId, "Contest ID in Contest Rating");
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
      console.log(response, "Contest Problems");
      setProblems(response);
    };
    fetchProblems();
  }, [contestId]);

  console.log(typeof startTime, "Start Time");
  console.log(typeof users[0]?.finishTime, "Finish Time");

  return (
    <div>
      {/* This is the contest rating page for the contest : {contestId} */}
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
        <div className="flex flex-col items-center justify-center">
          {users &&
            users.map((user, key) => (
              <React.Fragment key={user.user.id}>
                <div className="flex flex-row items-center justify-between w-full bg-[#ffffff05] p-4 rounded-lg mb-2 border border-[#ffffff10]">
                  <h1 className="text-lg font-medium text-white">{key + 1}</h1>
                  <Link
                    to={`/user/${user.user.id}`}
                    className="text-lg font-semibold text-white hover:text-yellow-300"
                  >
                    {user.user.username}
                  </Link>
                  <h1 className="text-lg font-medium text-white">
                    {(
                      (new Date(user.finishTime) - new Date(startTime)) /
                      (60 * 1000)
                    ).toFixed(2)}{" "}
                    minutes
                  </h1>
                  <h1
                    className={
                      `text-lg font-medium text-white` +
                      (user.ratingChange > 0
                        ? " text-green-500"
                        : " text-red-500")
                    }
                  >
                    {user.ratingChange}
                  </h1>
                  {/* <h1 className='text-lg font-medium text-white'>{user.penalty}</h1> */}
                  <div className="flex flex-row items-center gap-2">
                    {user.problems &&
                      user.problems.map((problem, index) => (
                        <div
                          key={index}
                          className="flex flex-row items-center justify-between w-full bg-[#ffffff05] p-4 rounded-lg mb-2 border border-[#ffffff10]"
                        >
                          {/* <h1 className='text-lg font-medium text-white'>{problem.problemId}</h1> */}
                          <h1 className="text-lg font-medium text-white">
                            {(new Date(problem.finishedAt).getTime() -
                              new Date(startTime).getTime()) /
                              1000}{" "}
                            seconds
                          </h1>
                          <h1 className="text-lg font-medium text-white">
                            {problem.solvedInContest === true ? (
                              <span className="text-green-500">Solved</span>
                            ) : (
                              <span className="text-red-500">Not Solved</span>
                            )}
                          </h1>
                          <h1 className="text-lg font-medium text-white px-2 py-0.2 rounded-full bg-white/5 flex gap-2 items-center">
                            {problem.score}
                          </h1>
                          {problem.penalty > 0 && (
                            <h1
                              className={`text-lg font-medium text-red-500 px-2 py-0.2 rounded-full bg-red-500/10 flex gap-2 items-center`}
                            >
                              {problem.penalty} <Bug className="h-4 w-4" />
                            </h1>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </React.Fragment>
            ))}
        </div>
      </div>
    </div>
  );
};

export default contestRanking;
