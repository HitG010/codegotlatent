const prisma = require("../services/prisma");
const { fetchFileFromGCS } = require("../services/gcs");
const { getSubmissionStatus } = require("../services/submission");
const { updateContestUser } = require("../services/contest");
const dotenv = require("dotenv");
dotenv.config();

async function submitCode(req, res) {
  const body = await req.body;
  const { problem_id, language_id, source_code, userId } = body;
  if (!problem_id || !language_id || !source_code || !userId) {
    return res.status(400).json({
      error: "problem_id, language_id, source_code and userId are required",
    });
  }

  // One round trip: limits + score + contest linkage + test cases.
  // Deliberately uncached — contest.status must be fresh so a submission made
  // right after a contest starts is attributed to the contest.
  let problem;
  try {
    problem = await prisma.problem.findUnique({
      where: { id: problem_id },
      select: {
        max_memory_limit: true, // in kBs
        max_time_limit: true, // in seconds
        problemScore: true,
        contest: { select: { id: true, status: true, startTime: true } },
        testCases: true,
      },
    });
  } catch (error) {
    console.error("Error fetching problem:", error);
    return res.status(500).json({ error: "Internal server error" });
  }

  if (!problem) {
    return res.status(404).json({ error: "Problem not found" });
  }

  const contest_id =
    problem.contest && problem.contest.status === "Ongoing"
      ? problem.contest.id
      : null;
  const testcases = problem.testCases;

  if (testcases.length === 0) {
    return res.status(400).json({ error: "No test cases found for problem" });
  }

  // A GCS failure here must return an error, not crash the process —
  // express 4 does not catch async throws from route handlers
  let submissions;
  try {
    submissions = await Promise.all(
      testcases.map(async (testCase) => {
      if (testCase.isGCS) {
        // console.log("Fetching test case from GCS:", testCase.id);
        const [stdin, stdout] = await Promise.all([
          fetchFileFromGCS(testCase.stdin),
          fetchFileFromGCS(testCase.stdout),
        ]);
        testCase.stdin = stdin;
        testCase.stdout = stdout;
      }

      return {
        source_code: source_code,
        language_id: language_id,
        stdin: testCase.stdin,
        expected_output: testCase.stdout,
        cpu_time_limit: problem.max_time_limit,
        // JUDGE0_MIN_MEMORY_KB: dev-only floor — Rosetta-emulated Judge0 on
        // Apple Silicon crashes below ~512MB address space; unset in prod
        memory_limit: Math.max(
          problem.max_memory_limit,
          Number(process.env.JUDGE0_MIN_MEMORY_KB) || 0
        ),
        cpu_extra_time: 0,
      };
      })
    );
  } catch (error) {
    console.error("Error preparing test cases:", error.message);
    return res
      .status(500)
      .json({ error: "Failed to load test cases for this problem" });
  }

  // long poll the server for submission status
  let result;
  try {
    const url = `${process.env.JUDGE0_API}/submissions/batch`;
    result = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ submissions: submissions }),
    });
  } catch (error) {
    console.error("Error submitting code batch:", error);
    return res.status(500).json({ error: "Failed to submit code batch" });
  }

  let response;
  try {
    const resultJson = await result.json();
    const tokensString = resultJson.map((item) => item.token).join(",");
    response = await getSubmissionStatus(tokensString);
  } catch (error) {
    console.error("Error judging submission:", error);
    return res.status(500).json({ error: "Judging failed or timed out" });
  }

  let finalVerdict = "Accepted";
  let passedTestcasesCnt = 0;
  let executionTime = 0;
  let memory = 0;
  // let errorToken = null;
  for (let i = 0; i < response.length; i++) {
    if (response[i].status.id > 3) {
      finalVerdict = response[i].status.description;
    } else if (response[i].status.id == 3) {
      passedTestcasesCnt++;
    }
    executionTime += parseFloat(response[i].time) || 0;
    memory += response[i].memory || 0;
  }

  let submission;
  try {
    submission = await prisma.submission.create({
      data: {
        problemId: problem_id,
        userId: userId,
        language: language_id,
        code: source_code,
        verdict: finalVerdict,
        score: passedTestcasesCnt,
        executionTime: executionTime,
        memoryUsage: memory,
        contestId: contest_id,
      },
    });
  } catch (error) {
    console.error("Error saving submission:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
  const isCorrect = finalVerdict === "Accepted";

  // Respond as soon as the verdict exists — the stats bookkeeping below
  // doesn't need to hold up the user.
  res.json(submission);

  try {
    await recordSubmissionStats({
      userId,
      problem_id,
      contest_id,
      problem,
      submission,
      isCorrect,
    });
  } catch (error) {
    console.error("Post-submission bookkeeping failed:", submission.id, error);
  }
}

// Updates ProblemUser/ContestUser stats after a submission has been judged.
async function recordSubmissionStats({
  userId,
  problem_id,
  contest_id,
  problem,
  submission,
  isCorrect,
}) {
  if (contest_id !== null) {
    // Get previous state for logical OR update
    const existingEntry = await prisma.problemUser.findUnique({
      where: {
        userId_problemId: {
          userId: userId,
          problemId: problem_id,
        },
      },
      select: {
        isSolved: true,
        solvedInContest: true,
        finishedAt: true,
      },
    });

    const previousIsSolved = existingEntry?.isSolved || false;
    const previousSolvedInContest = existingEntry?.solvedInContest || false;
    const problemScore = problem.problemScore || 0;

    await prisma.problemUser.upsert({
      where: {
        userId_problemId: {
          userId,
          problemId: problem_id,
        },
      },
      update: {
        isSolved: previousIsSolved || isCorrect,
        solvedInContest: previousSolvedInContest || isCorrect,
        score: isCorrect || previousIsSolved ? problemScore : 0,
        penalty: {
          increment: isCorrect ? 0 : 1,
        },
        finishedAt: existingEntry?.finishedAt
          ? existingEntry.finishedAt
          : isCorrect
          ? submission.createdAt
          : null,
      },
      create: {
        problemId: problem_id,
        userId,
        contestId: contest_id,
        isSolved: isCorrect,
        solvedInContest: isCorrect,
        score: isCorrect ? problemScore : 0,
        penalty: isCorrect ? 0 : 1,
        finishedAt: isCorrect ? submission.createdAt : null,
      },
    });

    // Contest start time was already fetched with the problem
    await updateContestUser(contest_id, userId, problem.contest.startTime);
  } else {
    // For non-contest submissions, do only isSolved update with OR
    const existingEntry = await prisma.problemUser.findUnique({
      where: {
        userId_problemId: {
          userId: userId,
          problemId: problem_id,
        },
      },
      select: {
        isSolved: true,
      },
    });

    const previousIsSolved = existingEntry?.isSolved || false;

    await prisma.problemUser.upsert({
      where: {
        userId_problemId: {
          userId: userId,
          problemId: problem_id,
        },
      },
      update: {
        isSolved: previousIsSolved || isCorrect,
      },
      create: {
        problemId: problem_id,
        userId: userId,
        isSolved: isCorrect,
      },
    });
  }
}
async function batchSubmission(req, res) {
  const body = await req.body;
  const { testcases, language_id, source_code, problem_id } = body;

  // fetch problem memory and time limits
  let problem;
  try {
    problem = await prisma.problem.findUnique({
      where: {
        id: problem_id,
      },
      select: {
        max_memory_limit: true, // in kBs
        max_time_limit: true, // in seconds
      },
      cacheStrategy: { ttl: 30 * 60 }, // cache for 30 minutes
    });
  } catch (error) {
    console.error("Error fetching problem limits:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
  if (!problem) {
    return res.status(404).json({ error: "Problem not found" });
  }
  const submissions = [];
  // console.log("Submissions:", submissions);
  testcases.forEach((testCase) => {
    const submission = {
      source_code: source_code,
      language_id: language_id,
      stdin: testCase.stdin,
      expected_output: testCase.stdout,
      // add memory and time limits
      cpu_time_limit: problem.max_time_limit,
      memory_limit: Math.max(
        problem.max_memory_limit,
        Number(process.env.JUDGE0_MIN_MEMORY_KB) || 0
      ),
      cpu_extra_time: 0, // in seconds, set to 0 for no extra time
    };
    submissions.push(submission);
  });
  // console.log("Submissions:", submissions);

  // console.log(JSON.stringify({ submissions: submissions }));

  let response;
  try {
    const url = `${process.env.JUDGE0_API}/submissions/batch`;
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ submissions: submissions }),
    });
  } catch (error) {
    console.error("Error submitting code batch:", error);
    return res.status(500).json({ error: "Failed to submit code batch" });
  }
  try {
    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error("Error parsing batch submission response:", error);
    return res.status(500).json({ error: "Failed to submit code batch" });
  }
}

async function getSubmission(req, res) {
  // console.log(req.params);
  let response;
  try {
    const url = `${process.env.JUDGE0_API}/submissions/${req.params.id}`;
    // console.log("URL:", url);
    response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error fetching submission:", error);
    return res.status(500).json({ error: "Failed to fetch submission" });
  }
  try {
    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error("Error parsing submission response:", error);
    return res.status(500).json({ error: "Failed to fetch submission" });
  }
}

async function pollSubmission(req, res) {
  if (!req.params.id) {
    return res.status(400).json({ error: "Submission ID is required" });
  }
  try {
    const response = await getSubmissionStatus(req.params.id);
    return res.json(response);
  } catch (error) {
    console.error("Error polling submission:", error);
    return res.status(500).json({ error: "Judging failed or timed out" });
  }
}

async function getUserSubmission(req, res) {
  const { submissionId, userId } = req.params;
  // console.log("Submission ID:", submissionId);
  // console.log("User ID:", userId);
  try {
    const submission = await prisma.Submission.findUnique({
      where: {
        id: submissionId,
        problem: {
          isPublic: true,
        },
      },
      select: {
        id: true,
        code: true,
        verdict: true,
        executionTime: true,
        memoryUsage: true,
        createdAt: true,
        contestId: true,
        userId: true,
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        problem: {
          select: {
            id: true,
            title: true,
            difficulty: true,
          },
        },
        contest: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      cacheStrategy: { ttl: 5 * 60 }, // cache for 5 minutes
    });
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }
    if (submission.userId === userId) {
      return res.status(200).json(submission);
    }
    if (submission.contestId === null) {
      return res.status(200).json(submission);
    }
    // Check if submission is of a contest
    const contest = await prisma.Contest.findUnique({
      where: {
        id: submission.contestId,
      },
      select: {
        status: true,
      },
      cacheStrategy: { ttl: 5 * 60 }, // cache for 5 minutes
    });
    if (
      contest.status === "Ended" ||
      contest.status === "Rating Update Pending"
    ) {
      return res.status(200).json(submission);
    } else {
      return res.status(403).json({ error: "Contest has not ended yet" });
    }
  } catch (error) {
    console.error("Error fetching problems:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  submitCode,
  batchSubmission,
  getSubmission,
  pollSubmission,
  getUserSubmission,
};
