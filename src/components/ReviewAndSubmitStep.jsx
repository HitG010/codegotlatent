import { useState } from "react";
import { addProblem } from "../api/api";

export default function ReviewAndSubmitStep({ data }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await addProblem(data);
      if (response) {
        alert("✅ Problem created successfully!");
        // You can also redirect or reset form here
      } else {
        alert("❌ Error creating problem. Please try again.");
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("❌ Server error while submitting the problem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 shadow-md rounded-xl p-6 space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
        Review & Submit
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
        {loading ? "Submitting..." : "🚀 Submit Problem"}
      </button>
    </div>
  );
}
