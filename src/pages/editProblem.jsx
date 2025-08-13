import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchProblem } from "../api/api";
import ProblemDetailsStep from "../components/ProblemDetailsStep";
import TagsStep from "../components/TagsStep";
import TestCasesStep from "../components/TestCasesStep";
import ReviewAndSubmitStep from "../components/ReviewAndSubmitStep";
import Navbar from "../components/Navbar";

export default function EditProblem() {
  const { problemId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [problemIdInput, setProblemIdInput] = useState(problemId || "");
  const [isEditing, setIsEditing] = useState(!!problemId);

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

  // Fetch problem data when component mounts or problemId changes
  useEffect(() => {
    if (problemId) {
      fetchProblemData(problemId);
    } else {
      setLoading(false);
    }
  }, [problemId]);

  const fetchProblemData = async (id) => {
    try {
      setLoading(true);
      setError("");
      // Using userId as 1 for admin access, you might want to get this from user context
      const data = await fetchProblem(id, 1);
      
      // Transform the fetched data to match our state structure
      setProblemData({
        title: data.title || "",
        description: data.description || "",
        difficulty: data.difficulty || "Easy",
        problemScore: data.problemScore || 0,
        contestId: data.contestId || "",
        max_time_limit: data.max_time_limit || 2,
        max_memory_limit: data.max_memory_limit || 262144,
        tags: data.tags || [],
        testCases: data.testCases || [],
      });
      setIsEditing(true);
    } catch (err) {
      console.error("Error fetching problem:", err);
      setError("Failed to fetch problem. Please check the problem ID and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleProblemIdSubmit = (e) => {
    e.preventDefault();
    if (problemIdInput.trim()) {
      navigate(`/admin/edit-problem/${problemIdInput.trim()}`);
    }
  };

  const steps = [
    <ProblemDetailsStep data={problemData} setData={setProblemData} />,
    <TagsStep data={problemData} setData={setProblemData} />,
    <TestCasesStep data={problemData} setData={setProblemData} />,
    <ReviewAndSubmitStep data={problemData} isEdit={true} problemId={problemId} />,
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex flex-col">
        <Navbar path="/admin/edit-problem" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white text-xl">Loading problem data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col">
      <Navbar path="/admin/edit-problem" />
      <div className="flex-1 p-4 lg:p-10 pt-20 lg:pt-24">
        <div className="max-w-4xl mx-auto">
          {!isEditing ? (
            // Problem ID input form
            <div className="bg-[#ffffff05] rounded-lg p-6 lg:p-8 border border-[#ffffff15]">
              <h1 className="text-2xl lg:text-3xl font-bold text-white mb-6">
                Edit Problem
              </h1>
              <form onSubmit={handleProblemIdSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="problemId"
                    className="block text-sm font-medium text-white/70 mb-2"
                  >
                    Problem ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="problemId"
                    type="text"
                    required
                    placeholder="Enter problem ID (e.g., 123)"
                    value={problemIdInput}
                    onChange={(e) => setProblemIdInput(e.target.value)}
                    className="w-full px-4 py-3 bg-[#ffffff08] border border-[#ffffff15] rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {error && (
                  <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
                >
                  Load Problem
                </button>
              </form>
            </div>
          ) : (
            // Problem editing interface
            <>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl lg:text-3xl font-bold text-white">
                  Edit Problem #{problemId}
                </h1>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setProblemIdInput("");
                    setStep(0);
                    navigate("/admin/edit-problem");
                  }}
                  className="text-white/70 hover:text-white transition-colors duration-200"
                >
                  Load Different Problem
                </button>
              </div>
              
              {/* Progress indicator */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  {["Details", "Tags", "Test Cases", "Review"].map((stepName, index) => (
                    <div
                      key={index}
                      className={`flex items-center ${
                        index <= step ? "text-blue-400" : "text-white/40"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 ${
                          index <= step
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-white/20 text-white/40"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span className="ml-2 text-sm font-medium">{stepName}</span>
                    </div>
                  ))}
                </div>
                <div className="w-full bg-[#ffffff10] rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((step + 1) / 4) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Current step content */}
              <div className="mb-8">{steps[step]}</div>

              {/* Navigation buttons */}
              <div className="flex justify-between">
                {step > 0 && (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="bg-[#ffffff10] hover:bg-[#ffffff15] text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                  >
                    Back
                  </button>
                )}
                {step < steps.length - 1 ? (
                  <button
                    onClick={() => setStep(step + 1)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 ml-auto"
                  >
                    Next
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
