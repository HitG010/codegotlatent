const prisma = require("../services/prisma");
// const { fetchFileFromGCS } = require("../services/gcs");
// const { getSubmissionStatus } = require("../services/judge0");
// const { updateContestUser } = require("../services/contestService");
const dotenv = require("dotenv");
dotenv.config();

async function submitCode(req, res){
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
    const contestStartTime = await prisma.contest.findUnique({
      where: {
        id: contest_id,
      },
      select: {
        startTime: true,
      },
    });

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
  return res.send(submission);
}

module.exports = { submitCode };