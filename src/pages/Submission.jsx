import { React } from "react";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getSubmission } from "../api/api";
import useUserStore from "../store/userStore";

export default function Submission() {
  const [submission, setSubmission] = useState(null);
  const { submissionId } = useParams();
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.accessToken);

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        console.log("Fetching submission with ID:", submissionId);
        console.log("User ID:", user.id);
        const response = await getSubmission(submissionId, user.id);
        setSubmission(response);
      } catch (error) {
        alert("Error fetching submission");
        console.error("Error fetching submission:", error);
      }
    };

    fetchSubmission();
  }, []);

  return (
    <div>
      <h1>Submission</h1>
      {submission ? (
        <div>
          <h2>Submission ID: {submission.id}</h2>
          {/* Create a non editable box where code is written with proper formatting */}
          <h3>Code:</h3>
          <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
            {submission.code}
          </pre>
          <p>{submission.verdict}</p>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
