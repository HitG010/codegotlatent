// import dotenv from "dotenv";
// dotenv.config();
import axios from "axios";
import { use } from "react";

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
async function executeCode(code, testCases, langId, probId) {
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
    problem_id: probId,
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

async function submitProblem(code, probId, langId, contestId = null, userId) {
  console.log("Code:", code);
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
    contest_id: contestId,
    callback_url: "http://localhost:5000/callback",
    userId: userId,
  };
  const url = `${import.meta.env.VITE_BASE_URL}/submitContestCode`;
  console.log("URL:", url);
  console.log("Body:", body);
  const response = await axios.post(url, body, options);
  console.log("Response:", response.data);
  return response.data;
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
  const response = await axios.post(url, body, options);
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

const fetchProblems = async (userId) => {
  const url = `${import.meta.env.VITE_BASE_URL}/allProblems/${userId}`;
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

const fetchProblem = async (problemId, userId) => {
  const url = `${
    import.meta.env.VITE_BASE_URL
  }/problem/${problemId}/user/${userId}`;
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

const getAllContestProblems = async (contestId, userId) => {
  const url = `${
    import.meta.env.VITE_BASE_URL
  }/contest/${contestId}/problems/user/${userId}`;
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

const getSubmission = async (submissionId, userId) => {
  const url = `${
    import.meta.env.VITE_BASE_URL
  }/submission/${submissionId}/user/${userId}`;
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
    console.error("Error fetching submission:", error);
    throw error;
  }
};

const getContestUsers = async (contestId) => {
  const url = `${import.meta.env.VITE_BASE_URL}/contest/${contestId}/users`;
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
    console.error("Error fetching contest users:", error);
    throw error;
  }
};

const fetchContestStartTime = async (contestId) => {
  const url = `${import.meta.env.VITE_BASE_URL}/contest/${contestId}/startTime`;
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
    console.error("Error fetching contest start time:", error);
    throw error;
  }
};

// submit user's submitted predicted rank to the backend
const submitRank = async (contestId, userId, rank) => {
  const url = `${
    import.meta.env.VITE_BASE_URL
  }/contest/${contestId}/user/${userId}/rank/${rank}`;
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
    console.error("Error submitting rank:", error);
    throw error;
  }
};

const getProblemAcceptance = async (problemId) => {
  const url = `${
    import.meta.env.VITE_BASE_URL
  }/problem/${problemId}/acceptance`;
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
    console.error("Error fetching problem acceptance:", error);
    throw error;
  }
};

const getUserProblemCount = async (userId) => {
  const url = `${import.meta.env.VITE_BASE_URL}/user/${userId}/problemCount`;
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
    console.error("Error fetching user problem count:", error);
    throw error;
  }
};

const getUserProblemSubmission = async (problemId, userId) => {
  // console.log("User ID:", userId);
  // console.log("Problem ID:", problemId);
  const url = `${
    import.meta.env.VITE_BASE_URL
  }/user/${userId}/problem/${problemId}/submission`;
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
    console.error("Error fetching user problem submission:", error);
    throw error;
  }
};

const getContestParticipants = async (contestId) => {
  const url = `${
    import.meta.env.VITE_BASE_URL
  }/contest/${contestId}/participants`;
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
    console.error("Error fetching contest participants:", error);
    throw error;
  }
};

const getUserData = async (userName) => {
  const url = `${import.meta.env.VITE_BASE_URL}/user/${userName}`;
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
    console.error("Error fetching user data:", error);
    throw error;
  }
};

const addProblem = async (problemData) => {
  const url = `${import.meta.env.VITE_BASE_URL}/addProblem`;
  console.log("URL:", url);
  try {
    const response = await axios.post(url, problemData, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
    console.log("Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error adding problem:", error);
    throw error;
  }
};

const getAllTags = async () => {
  const url = `${import.meta.env.VITE_BASE_URL}/tags`;
  const response = await axios.get(url, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
  console.log("Response:", response.data);
  return response.data;
};

// for settings page
const getUserDetails = async (userId) => {
  const url = `${import.meta.env.VITE_BASE_URL}/user/${userId}/details`;
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
    console.error("Error fetching user data:", error);
    throw error;
  }
};

const updateUserDetails = async (userId, userDetails) => {
  const url = `${import.meta.env.VITE_BASE_URL}/user/${userId}/update`;
  console.log("URL:", url);
  try {
    const response = await axios.post(url, userDetails, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
    console.log("Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error updating user details:", error);
    throw error;
  }
};

// function logoutUser(userId) {
//   const url = `${import.meta.env.VITE_BASE_URL}/auth/logout/${userId}`;
//   console.log("URL:", url);
//   return axios
//     .post(url, {}, { headers: { "Content-Type": "application/json" } })
//     .then((response) => {
//       console.log("Logout Response:", response.data);
//       return response.data;
//     })
//     .catch((error) => {
//       console.error("Error logging out user:", error);
//       throw error;
//     });
// }

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
  submitProblem,
  getSubmission,
  getContestUsers,
  fetchContestStartTime,
  submitRank,
  getProblemAcceptance,
  getUserProblemCount,
  getUserProblemSubmission,
  getContestParticipants,
  getUserData,
  addProblem,
  getAllTags,
  getUserDetails,
  updateUserDetails
};
