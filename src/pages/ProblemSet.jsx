import React, { useEffect, useState } from "react";
import axios from "axios";
import { fetchProblems } from "../api/api";
import { Link } from "react-router-dom";

const ProblemSet = () => {
  const [problems, setProblems] = useState([]);

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
