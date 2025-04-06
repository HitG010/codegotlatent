import React, { useEffect, useState } from "react";
import axios from "axios";
import { fetchProblems } from "../api/api";
import { Link, Navigate } from "react-router-dom";
import useUserStore from "../store/userStore";

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

  return (
    <div>
      <h1>Problem Set</h1>

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
  );
};

export default ProblemSet;
