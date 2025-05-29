import React, { useEffect, useState } from "react";
import axios from "axios";
import { fetchProblems } from "../api/api";
import { Link, Navigate } from "react-router-dom";
import useUserStore from "../store/userStore";
import Navbar from "../components/Navbar";
import DifficultyTag from "../components/DifficultyTag";
import AvatarProgressRing from "../components/avatarProgressRing";
import contestTrophy from "../assets/trophy.svg";
import { FaArrowRightLong, FaCheck, FaCross } from "react-icons/fa6";
import latentNavLogo from "../assets/latentNavLogo.svg";
import { getProblemAcceptance } from "../api/api";


const ProblemSet = () => {
  const [problems, setProblems] = useState([]);
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.accessToken);

  async function fetchProblemSet() {
    const response = await fetchProblems();
    setProblems([...response]);
  }


  useEffect(() => {
    fetchProblemSet();
  }, []);
  const pathname = window.location.pathname;
  return (
    <div>
      <div className="h-screen w-100vh flex flex-row justify-between bg-[#0F0F0F]">
        <Navbar path={pathname} />
        <div className="w-[80%] h-full flex flex-row justify-between gap-4">
          <div className="home flex flex-col h-full pl-10 pt-16 bg-[#0F0F0F] w-full">
            <h2 className="text-white text-4xl font-semibold mb-4">
              {" "}
              Problems{" "}
            </h2>
            {/* implementing a search component here */}
            <div className="search-bar mb-4">
              <input
                type="text"
                placeholder="Search questions by topics, difficulty, name, etc."
                className="w-full py-3 px-5 rounded-full bg-[#ffffff25] text-[#ffffff] focus:outline-none"
              />
            </div>
            <div className="problem-statement">
              {problems.map((problem, idx) => (
                <Link key={problem.id} to={`/problem/${problem.id}`}>
                  <div className="flex flex-row justify-between items-center bg-[#1A1A1A] p-4 mb-4 rounded-lg hover:bg-[#2A2A2A] transition-colors duration-300">
                    <div className="flex flex-row gap-3">
                      {problem.isCorrect ? (
                        <FaCheck/>
                      ) : (
                        <div className="h-4 w-4"/>
                      )}
                      <h2 className="font-semibold text-lg">
                        {idx + 1}. {problem.title}
                      </h2>
                    </div>
                    <p className="text-gray-400 text-sm">
                      {problem.submissionCount > 0 ? 
                      (problem.acceptedCount/problem.submissionCount).toFixed(2) : 0}%
                    </p>
                    <p key={idx}>
                      {/* <strong>Difficulty:</strong> {problem.difficulty} */}
                      <DifficultyTag tag={problem.difficulty} />
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div className="flex flex-col h-fit gap-4">
            <div className="py-4 px-8 rounded-2xl bg-[#ffffff25] h-fit mt-30 mr-8 flex flex-col">
              <div className="flex flex-row gap-12 items-center">
                {/* <div className="rounded-full w-22 h-22 flex items-center justify-center">
                <div className="rounded-full bg-[#ffffff25] w-20 h-20"></div>
              </div> */}
                <AvatarProgressRing progress={70} imageUrl={"../assets/latentNavLogo.png"} />
                <div className="flex flex-col gap-1">
                  <div className="flex flex-row justify-between w-[170px]">
                    <p className="text-lg font-medium text-green-500">Easy</p>
                    <p className="text-white text-lg font-medium">1/10</p>
                  </div>
                  <div className="flex flex-row justify-between">
                    <p className="text-yellow-500 text-lg font-medium">
                      Medium
                    </p>
                    <p className="text-white text-lg font-medium">1/10</p>
                  </div>
                  <div className="flex flex-row justify-between">
                    <p className="text-red-500 text-lg font-medium">Hard</p>
                    <p className="text-white text-lg font-medium">1/10</p>
                  </div>
                </div>
              </div>
            </div>
            <Link
              to={"/contests"}
              className="mr-8 problem-button flex-1 pt-5 pl-5 pb-5 flex flex-row items-center border-1 border-[#1267D020] rounded-3xl hover:inset-shadow-xs hover:inset-shadow-[#F4DD6A45] hover:cursor-pointer transition-all duration-300 hover:bg-[#1267D010]"
              style={{
                boxShadow:
                  "inset 0 0 30px rgba(17, 112, 228, 0.15), inset 0 0 10px rgba(17, 112, 228, 0.08), inset 0 1px 2px rgba(17, 112, 228, 0.27)",
              }}
            >
              <div className="flex flex-col p-2">
                <div className="flex flex-row gap-3 items-center justify-items-start mb-3 hover:gap-4 transition-all duration-300">
                  <h1 className="text-2xl font-semibold">Contests</h1>
                  <FaArrowRightLong className="h-5 w-5" />
                </div>
                <p className="text-[#ffffff65] text-sm">
                  Show your coding skills in Rated Contests with a Twist in
                  Ratings. Attempt a Contest Now!
                </p>
              </div>
              <img
                src={contestTrophy}
                alt="Contest Trophy"
                className="h-20 w-20 mr-5"
              />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemSet;
