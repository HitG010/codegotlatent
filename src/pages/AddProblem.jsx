import { useState } from "react";
import ProblemDetailsStep from "../components/ProblemDetailsStep";
import TagsStep from "../components/TagsStep";
import TestCasesStep from "../components/TestCasesStep";
import ReviewAndSubmitStep from "../components/ReviewAndSubmitStep";

export default function Admin() {
  const [step, setStep] = useState(0);

  const [problemData, setProblemData] = useState({
    title: "",
    description: "",
    difficulty: "Easy",
    problemScore: 0,
    contestId: "",
    max_time_limit: 2,
    max_memory_limit: 262144,
    tags: [],
    testCases: [],
  });

  const steps = [
    <ProblemDetailsStep data={problemData} setData={setProblemData} />,
    <TagsStep data={problemData} setData={setProblemData} />,
    <TestCasesStep data={problemData} setData={setProblemData} />,
    <ReviewAndSubmitStep data={problemData} />,
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Create New Problem</h1>
      <div>{steps[step]}</div>
      <div className="flex justify-between mt-6">
        {step > 0 && (
          <button className="btn" onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}
        {step < steps.length - 1 ? (
          <button className="btn" onClick={() => setStep(step + 1)}>
            Next
          </button>
        ) : null}
      </div>
    </div>
  );
}
