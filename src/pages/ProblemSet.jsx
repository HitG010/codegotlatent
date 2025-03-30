import React, { useEffect, useState } from 'react'
import axios from 'axios';
import {fetchProblems} from "../api/api";

const ProblemSet = () => {
    const [problems, setProblems] = useState([]);
    
    useEffect(async () => {
        const response = await fetchProblems();
        setProblems(response.data);
        console.log("Problems:", response.data);
    }, []);

  return (
    <div>
        <h1>Problem Set</h1>
        <div className="problem-statement">
            {problems.map((problem) => (
            <div key={problem.id} className="problem-card">
                <h2>{problem.title}</h2>
                <p><strong>Difficulty:</strong> {problem.difficulty}</p>
            </div>
            ))}
        </div>

    </div>
  )
}

export default ProblemSet;
