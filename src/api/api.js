// import dotenv from "dotenv";
// dotenv.config();
import axios from "axios";

async function api() {
  const options = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };

  //   if (body) {
  //     options.body = JSON.stringify(body);
  //   }
  const url = `${import.meta.env.VITE_BASE_URL}/hello`;
  console.log("URL:", url);
  return await fetch(url, options)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .catch((error) => {
      console.error(
        "There has been a problem with your fetch operation:",
        error
      );
    });
}

async function executeCode(code) {
  console.log("Code:", typeof code);
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  };
  const body = {
    source_code: code,
    language_id: "71",
    stdin: "",
    callback_url: "http://localhost:5000/callback",
  };
  const url = `${import.meta.env.VITE_BASE_URL}/submission`;
  console.log("URL:", url);
  console.log("Body:", body);
  const response = await axios.post(url, body, options);
  console.log("Response:", response.data);
  // await pollSubmissionStatus(response.data.token).then((data) => {
  //   console.log("Polling Response:", data);
  // });
  return response.data;
}

// long polling judge0 server for submission status
const pollSubmissionStatus = async (submissionId) => {
  const url = `${import.meta.env.VITE_BASE_URL}/submission/${submissionId}`;
  console.log("Polling URL:", url);
  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
    console.log("Polling Response:", response.data);
    if(response.data.status.id < 3){
      console.log("Submission is still processing...");
      // Wait for a few seconds before polling again
      await new Promise((resolve) => setTimeout(resolve, 200));
      return pollSubmissionStatus(submissionId);
    }
    else return response.data;
  } catch (error) {
    console.error("Error polling submission status:", error);
    throw error;
  }
}

const fetchProblems = async () => {
  const url = `${import.meta.env.VITE_BASE_URL}/problems`;
  console.log("URL:", url);
  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
    console.log("Response:", response.data);
  } catch (error) {
    console.error("Error fetching problems:", error);
  }
};

export { api, executeCode, pollSubmissionStatus, fetchProblems };
