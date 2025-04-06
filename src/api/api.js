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

// batch submission
async function executeCode(code, testCases, langId) {
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
    language_id: langId,
    testcases: testCases,
    callback_url: "http://localhost:5000/callback",
  };
  const url = `${import.meta.env.VITE_BASE_URL}/batchSubmission`;
  console.log("URL:", url);
  console.log("Body:", body);
  const response = await axios.post(url, body, options);
  console.log("Response:", response.data);
  // await pollSubmissionStatus(response.data.token).then((data) => {
  //   console.log("Polling Response:", data);
  // });
  const tokensString = response.data.map((item) => item.token).join(",");
  console.log("Tokens String:", tokensString);
  return tokensString;
}

async function submitCode(code, probId, langId) {
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
    language_id: langId,
    problem_id: probId,
    callback_url: "http://localhost:5000/callback",
  };
  const url = `${import.meta.env.VITE_BASE_URL}/batchSubmitProblem`;
  console.log("URL:", url);
  console.log("Body:", body);
  const response = await axios.post(url, body, options3);
  console.log("Response:", response.data);
  // await pollSubmissionStatus(response.data.token).then((data) => {
  //   console.log("Polling Response:", data);
  // });
  const tokensString = response.data.map((item) => item.token).join(",");
  console.log("Tokens String:", tokensString);
  return tokensString;
}

// long polling judge0 server for submission status
const pollSubmissionStatus = async (
  submissionId,
  problemId,
  flag,
  sourceCode,
  langId
) => {
  const url = `${import.meta.env.VITE_BASE_URL}/pollSubmission/${submissionId}`;
  console.log("Polling URL:", url);
  try {
    console.log("Waiting for response at Front");
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    };
    const body = {
      submissionId: submissionId,
      problemId: problemId,
      flag: flag,
      sourceCode: sourceCode,
      languageId: langId,
    };
    const response = await axios.post(url, body, options);
    console.log("Polling Response:", response);
    return response.data;
  } catch (error) {
    console.error("Error polling submission status:", error);
    throw error;
  }
};

const fetchProblems = async () => {
  const url = `${import.meta.env.VITE_BASE_URL}/allProblems`;
  console.log("URL:", url);
  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
    console.log("Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching problems:", error);
  }
};

const fetchProblem = async (problemId) => {
  const url = `${import.meta.env.VITE_BASE_URL}/problem/${problemId}`;
  console.log("URL:", url);
  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
    console.log("Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching problem:", error);
    throw error;
  }
};

const fetchTestcases = async (problemId) => {
  console.log("Problem ID:", problemId);
  const url = `${import.meta.env.VITE_BASE_URL}/getTestcases/${problemId}`;
  console.log("URL:", url);
  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
    console.log("Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching test cases:", error);
    throw error;
  }
};

const fetchContests = async () => {
  const url = `${import.meta.env.VITE_BASE_URL}/contests`;
  console.log("URL:", url);
  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
    console.log("Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching contests:", error);
    throw error;
  }
};

const getContest = async (contestId) => {
  const url = `${import.meta.env.VITE_BASE_URL}/contest/${contestId}`;
  console.log("URL:", url);
  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
    console.log("Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching contest:", error);
    throw error;
  }
};

const getIfUserRegistered = async (contestId, userId) => {
  const url = `${
    import.meta.env.VITE_BASE_URL
  }/contest/${contestId}/participants/${userId}`;
  console.log("URL:", url);
  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
    console.log("Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching contest:", error);
    throw error;
  }
};

const registerUser = async (contestId, userId) => {
  const url = `${
    import.meta.env.VITE_BASE_URL
  }/contest/${contestId}/register/${userId}`;
  console.log("URL:", url);
  try {
    const response = await axios.post(url, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
    console.log("Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error registering user:", error);
    throw error;
  }
};
const unregisterUser = async (contestId, userId) => {
  const url = `${
    import.meta.env.VITE_BASE_URL
  }/contest/${contestId}/unregister/${userId}`;
  console.log("URL:", url);
  try {
    const response = await axios.post(url, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
    console.log("Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error unregistering user:", error);
    throw error;
  }
};

const getAllContestProblems = async (contestId) => {
  const url = `${import.meta.env.VITE_BASE_URL}/contest/${contestId}/problems`;
  console.log("URL:", url);
  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
    console.log("Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching contest problems:", error);
    throw error;
  }
};

const fetchContestProblem = async (problemId, contestId, userId) => {
  const url = `${
    import.meta.env.VITE_BASE_URL
  }/contest/${contestId}/problem/${problemId}/user/${userId}`;
  console.log("URL:", url);
  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
    console.log("Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching contest problem:", error);
    throw error;
  }
};

export {
  api,
  executeCode,
  pollSubmissionStatus,
  fetchProblems,
  fetchProblem,
  fetchTestcases,
  submitCode,
  fetchContests,
  getContest,
  getIfUserRegistered,
  registerUser,
  unregisterUser,
  getAllContestProblems,
  fetchContestProblem,
};
