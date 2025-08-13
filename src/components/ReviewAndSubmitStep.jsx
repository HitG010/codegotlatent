import { useState } from "react";
import { addProblem, updateProblem } from "../api/api";

export default function ReviewAndSubmitStep({ data, isEdit = false, problemId = null }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let response;
      if (isEdit && problemId) {
        response = await updateProblem(problemId, data);
        if (response) {
          alert("✅ Problem updated successfully!");
        } else {
          alert("❌ Error updating problem. Please try again.");
        }
      } else {
        response = await addProblem(data);
        if (response) {
          alert("✅ Problem created successfully!");
        } else {
          alert("❌ Error creating problem. Please try again.");
        }
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert(`❌ Server error while ${isEdit ? "updating" : "creating"} the problem.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 shadow-md rounded-xl p-6 space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
        Review & {isEdit ? "Update" : "Submit"}
      </h2>

      <div className="max-h-[400px] overflow-auto bg-gray-100 dark:bg-gray-800 p-4 rounded-md text-sm text-gray-800 dark:text-gray-200">
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className={`w-full px-4 py-2 text-white font-semibold rounded-md transition ${
          loading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-700"
        }`}
      >
        {loading 
          ? `${isEdit ? "Updating" : "Submitting"}...` 
          : `🚀 ${isEdit ? "Update Problem" : "Submit Problem"}`
        }
      </button>
    </div>
  );
}
