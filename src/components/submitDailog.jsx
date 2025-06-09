import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle } from "lucide-react";

const SubmitDialog = ({ isOpen, onClose, verdict, submissionId }) => {
//   const navigate = useNavigate();

  const getIcon = () => {
    switch (verdict) {
      case "Accepted":
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case "Wrong Answer":
      case "Time Limit Exceeded":
        return <XCircle className="w-8 h-8 text-red-500" />;
      default:
        return <XCircle className="w-8 h-8 text-yellow-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="bg-white dark:bg-[#212121] p-6 rounded-2xl shadow-xl w-full max-w-md text-center relative">
        {/* Close Button (optional top-right) */}
        {/* <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-white"
        >
          ✕
        </button> */}

        <div className="flex justify-center mb-4">{getIcon()}</div>

        <h2 className="text-xl font-bold mb-2">
          {verdict === "Accepted" ? "Congratulations!" : "Submission Result"}
        </h2>

        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Verdict: <span className="font-semibold">{verdict}</span>
        </p>

        <div className="flex justify-center gap-4">
          <button
            className="bg-white text-black px-4 py-2 rounded rounded-lg hover:bg-white/75 transition cursor-pointer"
            onClick={() => {
                window.open(`/submission/${submissionId}`, "_blank", "noopener,noreferrer");
            }}
          >
            View Submission
          </button>
          <button
            className="px-4 py-2 rounded border border-white/15 rounded rounded-lg hover:bg-white/5 transition cursor-pointer"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubmitDialog;
