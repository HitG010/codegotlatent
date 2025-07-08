const prisma = require("../services/prisma");
const { fetchFileFromGCS } = require("../services/gcs");
const { getSubmissionStatus } = require("../services/submission");
const { updateContestUser } = require("../services/contest");
const { getContestStartTime } = require("../services/contest");
const dotenv = require("dotenv");
const { get } = require("http");
dotenv.config();

async function submitCode(req, res) {
  const body = await req.body;
  const { problem_id, language_id, source_code, userId } = body;

  let contest_id = await prisma.Problem.findUnique({
    where: {
      id: problem_id,
      contest: {
        status: "Ongoing", // Ensure the contest is ongoing
      },
    },
    select: {
      contestId: true, // Get the contest ID if the problem is part of an ongoing contest
    },
  });
  console.log("Contest ID hue hue hue:", contest_id);
  if (contest_id) contest_id = contest_id.contestId;
  console.time("Fetch Testcases");
  const testcases = await prisma.TestCase.findMany({
    where: {
      problemId: problem_id,
    },
  });

  // fetch problem memory and time limits
  const problem = await prisma.Problem.findUnique({
    where: {
      id: problem_id,
    },
    select: {
      max_memory_limit: true, // in kBs
      max_time_limit: true, // in seconds
    },
  });
  // console.log("Submissions:", submissions);
  const submissions = await Promise.all(
    testcases.map(async (testCase) => {
      if (testCase.isGCS) {
        console.log("Fetching test case from GCS:", testCase.id);
        const [stdin, stdout] = await Promise.all([
          fetchFileFromGCS(testCase.stdin),
          fetchFileFromGCS(testCase.stdout),
        ]);
        testCase.stdin = stdin;
        testCase.stdout = stdout;
      }

      return {
        source_code: source_code || "// No code submitted",
        language_id: language_id,
        stdin: testCase.stdin,
        expected_output: testCase.stdout,
        cpu_time_limit: problem.max_time_limit,
        memory_limit: problem.max_memory_limit,
        cpu_extra_time: 0,
      };
    })
  );

  console.timeEnd("Fetch Testcases");

  console.time("Submission");

  console.log("Submissions:", submissions);

  // long poll the server for submission status
  const url = `${process.env.JUDGE0_API}/submissions/batch`;
  const result = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ submissions: submissions }),
  });

  console.log("Result:", result);

  const resultJson = await result.json();
  console.log("Batch submission string: ", result);
  const tokensString = resultJson.map((item) => item.token).join(",");

  const response = await getSubmissionStatus(tokensString);

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
    executionTime += parseFloat(response[i].time);
    memory += response[i].memory;
  }

  const submission = await prisma.Submission.create({
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
  console.log("Submission:", submission);
  console.log("submission created successfully. Verdict:", finalVerdict);
  const isCorrect = finalVerdict === "Accepted";

  if (contest_id !== null) {
    // Get previous state for logical OR update
    const existingEntry = await prisma.problemUser.findFirst({
      where: {
        userId: userId,
        problemId: problem_id,
        contestId: contest_id,
      },
      select: {
        isSolved: true,
        solvedInContest: true,
        finishedAt: true,
      },
    });

    const previousIsSolved = existingEntry?.isSolved || false;
    const previousSolvedInContest = existingEntry?.solvedInContest || false;
    const { problemScore = 0 } = await prisma.problem.findUnique({
      where: { id: problem_id },
      select: { problemScore: true },
    });

    const updatedContestProblem = await prisma.problemUser.upsert({
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

    // Fetch contest start time
    const contestStartTime = await getContestStartTime(contest_id);

    const updatedContestUser = await updateContestUser(
      contest_id,
      userId,
      contestStartTime.startTime
    );
  } else {
    // For non-contest submissions, do only isSolved update with OR
    const existingEntry = await prisma.problemUser.findFirst({
      where: {
        userId: userId,
        problemId: problem_id,
      },
      select: {
        isSolved: true,
      },
    });

    const previousIsSolved = existingEntry?.isSolved || false;

    const updatedProblemUser = await prisma.problemUser.upsert({
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

  console.timeEnd("Submission");
  return res.json(submission);
}
async function batchSubmission(req, res) {
  const body = await req.body;
  const { testcases, language_id, source_code, problem_id } = body;

  // fetch prolem memory and time limits
  const problem = await prisma.Problem.findUnique({
    where: {
      id: problem_id,
    },
    select: {
      max_memory_limit: true, // in kBs
      max_time_limit: true, // in seconds
    },
  });
  const submissions = [];
  console.log("Submissions:", submissions);
  testcases.forEach((testCase) => {
    const submission = {
      source_code: source_code,
      language_id: language_id,
      stdin: testCase.stdin,
      expected_output: testCase.stdout,
      // add memory and time limits
      cpu_time_limit: problem.max_time_limit,
      memory_limit: problem.max_memory_limit,
      cpu_extra_time: 0, // in seconds, set to 0 for no extra time
    };
    submissions.push(submission);
  });
  // console.log("Submissions:", submissions);

  console.log(JSON.stringify({ submissions: submissions }));

  const url = `${process.env.JUDGE0_API}/submissions/batch`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ submissions: submissions }),
  });
  const data = await response.json();
  console.log("Response:", data);

  // res.status(200).send("OK");
  return res.json(data);
}

async function getSubmission(req, res) {
  console.log(req.params);
  const url = `${process.env.JUDGE0_API}/submissions/${req.params.id}`;
  console.log("URL:", url);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
  const data = await response.json();
  console.log("Response:", data);

  // res.status(200).send("OK");
  return res.json(data);
}

async function pollSubmission(req, res) {
  const response = await getSubmissionStatus(req.params.id);
  console.log("Response:", response);
  return res.json(response);
}

async function getUserSubmission(req, res) {
  const { submissionId, userId } = req.params;
  console.log("Submission ID:", submissionId);
  console.log("User ID:", userId);
  try {
    const submission = await prisma.Submission.findUnique({
      where: {
        id: submissionId,
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
