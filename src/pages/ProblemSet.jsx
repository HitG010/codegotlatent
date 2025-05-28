import React, { useEffect, useState } from "react";
import axios from "axios";
import { fetchProblems } from "../api/api";
import { Link, Navigate } from "react-router-dom";
import useUserStore from "../store/userStore";
import Navbar from "../components/Navbar";

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
            <Navbar path={pathname}/>
            <div className="home flex flex-col h-full w-[80%] p-10 pt-16 bg-[#0F0F0F]">
              <h2 className="text-white text-4xl font-semibold mb-4"> Problems </h2>
              {/* implementing a search component here */}
              <div className="search-bar mb-4">
                <input
                  type="text"
                  placeholder="Search questions by topics, difficulty, name, etc."
                  className="w-full py-3 px-5 rounded-full bg-[#ffffff25] text-[#ffffff] focus:outline-none"
                />
              </div>
              <div className="problem-statement">
                {problems.map((problem) => (
                  <Link key={problem.id} to={`/problem/${problem.id}`}>
                    <div className="problem-card">
                      <h2>{problem.title}</h2>
                      <p>
                        <strong>Difficulty:</strong> {problem.difficulty}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
      </div>
    </div>
  );
};

export default ProblemSet;
