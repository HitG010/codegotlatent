const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const v4 = require("uuid").v4;
const bcrypt = require("bcrypt");
const schedule = require("node-schedule");
const cron = require("node-cron");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client/edge");
const { withAccelerate } = require("@prisma/extension-accelerate");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const axios = require("axios");
const { exec } = require("child_process");
const { stat } = require("fs");
// const authRoutes = require("./routes/auth");

const prisma = new PrismaClient().$extends(withAccelerate());

// const submissionRoutes = require("./routes/index");

const app = express();
const server = require("http").createServer(app);
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: [process.env.CLIENT_URL, `${process.env.CLIENT_URL}/auth`],
    credentials: true,
  })
);
app.use(cookieParser());
// app.route("/auth", authRoutes);

// app.use("/api", submissionRoutes);

// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

// app.get("/hello", (req, res) => {
//   res.json({ message: "Hello World" });
// });

const io = new Server(server, {
  path: "/socket.io",
  cors: {
    origin: "*",
  },
});

// console.log(io, "io");

// When a user connects, log the connection
io.on("connection", (socket) => {
  console.log("A user connected", socket.id);
});

async function scheduleUpcomingContests() {
  const contests = await prisma.Contest.findMany({
    where: {
      status: "Upcoming",
    },
    select: {
      rankGuessStartTime: true,
      id: true,
    },
  });
  console.log("Contests:", contests);
  contests.forEach((contest) => {
    const rankGuessStartTime = new Date(contest.rankGuessStartTime);
    console.log("Rank Guess Start Time:", rankGuessStartTime);

    const date = rankGuessStartTime.getDate();
    const month = rankGuessStartTime.getMonth(); // 0-11
    const year = rankGuessStartTime.getFullYear();
    const hour = rankGuessStartTime.getHours();
    const minute = rankGuessStartTime.getMinutes();
    const second = rankGuessStartTime.getSeconds();
    // console.log("start time:", startTime);
    // const date = new Date(start);
    const RankGuessDate = new Date(year, month, date, hour, minute, second);
    // console.log("Start Time:", startTime);
    schedule.scheduleJob(RankGuessDate, async () => {
      console.log("Contest Rank Guess phase started:", contest.name);
      // Update the contest status to "Ongoing"
      const updatedContest = await prisma.Contest.update({
        where: {
          id: contest.id,
        },
        data: {
          status: "Rank Guess Phase",
        },
      });
      console.log("Contest updated:", updatedContest);
      io.emit("contestRankGuessPhaseStarted", {
        contestId: contest.id,
        updatedContest,
      });
    });
  });
}

async function scheduleRankGuessContests() {
  const contests = await prisma.Contest.findMany({
    where: {
      status: "Rank Guess Phase",
    },
    select: {
      startTime: true,
      id: true,
    },
  });
  console.log("Contests:", contests);
  contests.forEach((contest) => {
    const startTime = new Date(contest.startTime);
    console.log("Start Time:", startTime);

    const date = startTime.getDate();
    const month = startTime.getMonth(); // 0-11
    const year = startTime.getFullYear();
    const hour = startTime.getHours();
    const minute = startTime.getMinutes();
    const second = startTime.getSeconds();
    // console.log("start time:", startTime);
    // const date = new Date(start);
    const StartDate = new Date(year, month, date, hour, minute, second);
    // console.log("Start Time:", startTime);
    schedule.scheduleJob(StartDate, async () => {
      console.log("Contest started:", contest.name);
      // Update the contest status to "Ongoing"
      const updatedContest = await prisma.Contest.update({
        where: {
          id: contest.id,
        },
        data: {
          status: "Ongoing",
        },
      });
      console.log("Contest updated:", updatedContest);
      io.emit("contestStarted", { contestId: contest.id, updatedContest });
    });
  });
}

async function scheduleOngoingContests() {
  const contests = await prisma.Contest.findMany({
    where: {
      status: "Ongoing",
    },
    select: {
      endTime: true,
      id: true,
    },
  });
  console.log("Contests:", contests);
  contests.forEach((contest) => {
    const endTime = new Date(contest.endTime);
    console.log("End Time:", endTime);
    const date = endTime.getDate();
    const month = endTime.getMonth(); // 0-11
    const year = endTime.getFullYear();
    const hour = endTime.getHours();
    const minute = endTime.getMinutes();
    const second = endTime.getSeconds();
    // console.log("end time:", endTime);
    // const date = new Date(end);
    const EndDate = new Date(year, month, date, hour, minute, second);
    // console.log("End Time:", endTime);
    schedule.scheduleJob(EndDate, async () => {
      console.log("Contest rating update phase started:", contest.name);
      // Update the contest status to "Ended"
      const updatedContest = await prisma.Contest.update({
        where: {
          id: contest.id,
        },
        data: {
          status: "Rating Update Pending",
        },
      });
      console.log("Contest updated:", updatedContest);
      // call the ranking update function
      submitContest(contest.id);
      io.emit("contestRatingPending", {
        contestId: contest.id,
        updatedContest,
      });
    });
  });
}

async function scheduleRatingPendingContests() {
  const contests = await prisma.Contest.findMany({
    where: {
      status: "Rating Update Pending",
    },
    select: {
      endTime: true,
      id: true,
    },
  });
  console.log("Contests:", contests);
  contests.forEach((contest) => {
    const endTime = new Date(contest.endTime);
    console.log("End Time:", endTime);
    const date = endTime.getDate();
    const month = endTime.getMonth(); // 0-11
    const year = endTime.getFullYear();
    const hour = endTime.getHours();
    const minute = endTime.getMinutes();
    const second = endTime.getSeconds();
    // console.log("end time:", endTime);
    // const date = new Date(end);
    const EndDate = new Date(year, month, date, hour, minute, second);
    // console.log("End Time:", endTime);
    schedule.scheduleJob(new Date(EndDate.getTime() + 2 * 60 * 1000), async () => {
      console.log("Contest Rating Update Phase Started:", contest.name);
      // Update the contest status to "Ended"
      const updatedContest = await prisma.Contest.update({
        where: {
          id: contest.id,
        },
        data: {
          status: "Ended",
        },
      });
      console.log("Contest updated:", updatedContest);
      io.emit("contestEnded", { contestId: contest.id, updatedContest });
    });
  });
}

// async function scheduleRatingUpdateContests() {
//   const contests = await prisma.Contest.findMany({
//     where: {
//       status: "Rating Update Pending",
//     },
//     select: {
//       endTime: true,
//       id: true,
//     },
//   });
//   console.log("Contests:", contests);
//   contests.forEach((contest) => {
//     const endTime = new Date(contest.endTime);
//     console.log("End Time:", endTime);

//     const date = endTime.getDate();
//     const month = endTime.getMonth(); // 0-11
//     const year = endTime.getFullYear();
//     const hour = endTime.getHours();
//     const minute = endTime.getMinutes();
//     const second = endTime.getSeconds();
//     // console.log("end time:", endTime);
//     // const date = new Date(end);
//     const EndDate = new Date(year, month, date, hour, minute, second);
//     // console.log("End Time:", endTime);
//     schedule.scheduleJob(EndDate + 5*60*1000, async () => {
//       console.log("Contest Rating Update Finished:", contest.name);
//       // Update the contest status to "Ended"
//       const updatedContest = await prisma.Contest.update({
//         where: {
//           id: contest.id,
//         },
//         data: {
//           status: "Rating Update Finished",
//         },
//       });
//       console.log("Contest updated:", updatedContest);
//       io.emit("contestRatingUpdateFinished", { contestId: contest.id, updatedContest });

//     });
//   });
// }

// scheduleContests();
// CALL THE FUNCTION TO SCHEDULE CONTESTS AFTER 1 DAY FOR AUTOMATICALLY SCHEDULING NEWLY CREATED CONTESTS IN THE DATABASE IN FUTURE
// cron.schedule("0 0 * * *", async () => {
//   console.log("Scheduling contests");
//   await scheduleContests();
// });

// create a similiar cron job for every 1 min
cron.schedule("*/1 * * * *", async () => {
  console.log("Scheduling contests");
  // status -> upcoming, rank guess, ongoing, rating pending, ended
  await scheduleUpcomingContests();
  await scheduleRankGuessContests();
  await scheduleOngoingContests();
  await scheduleRatingPendingContests();
  console.log("Contests scheduled");
});

app.put("/callback", (req, res) => {
  console.log("Callback received:", req.body);
  res.status(200).send("OK");
});

// Submission of any type of code for a problem ( contest or not )
app.post("/submitContestCode", async (req, res) => {
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
  if(contest_id) contest_id = contest_id.contestId;
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

  const submissions = [];
  console.log("Submissions:", submissions);
  testcases.forEach((testCase) => {
    const submission = {
      source_code: source_code || "// No code submitted",
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

    const updatedContestProblem = await prisma.problemUser.upsert({
      where: {
        userId_problemId: {
          userId: userId,
          problemId: problem_id,
        },
      },
      update: {
        isSolved: previousIsSolved || isCorrect,
        solvedInContest: previousSolvedInContest || isCorrect,
        score:
          isCorrect || previousIsSolved
            ? (
                await prisma.problem.findUnique({ where: { id: problem_id } })
              )?.problemScore || 0
            : 0,
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
        userId: userId,
        contestId: contest_id,
        isSolved: isCorrect,
        solvedInContest: isCorrect,
        score: isCorrect
          ? (
              await prisma.problem.findUnique({ where: { id: problem_id } })
            )?.problemScore || 0
          : 0,
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

  return res.send(submission);
});

const updateContestUser = async (contestId, userId, contestStartTime) => {
  const response = await prisma.problemUser.aggregate({
    where: {
      contestId: contestId,
      userId: userId,
      solvedInContest: true,
    },
    _sum: {
      penalty: true,
      score: true,
    },
  });
  console.log("Response: ", response);
  const totalPenalties = response._sum.penalty;
  const totalScore = response._sum.score;
  let totalFinishTime = contestStartTime;
  // add 5 mins for each penalty
  if (totalFinishTime != 0) totalFinishTime += totalPenalties * 5 * 60 * 1000;
  const updatedContestUser = await prisma.contestUser.update({
    where: {
      userId_contestId: {
        userId: userId,
        contestId: contestId,
      },
    },
    data: {
      finishTime: new Date(totalFinishTime),
      score: totalScore || 0,
      penalty: totalPenalties || 0,
    },
  });
  return updatedContestUser;
};

app.post("/batchSubmission", async (req, res) => {
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
  console.log("Submissions:", submissions);

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
  res.send(data);
});

app.post("/batchSubmitProblem", async (req, res) => {
  const body = await req.body;
  const { problem_id, language_id, source_code } = body;

  const testcases = await prisma.TestCase.findMany({
    where: {
      problemId: problem_id,
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
    };
    submissions.push(submission);
  });
  console.log("Submissions:", submissions);

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
  res.send(data);
});
// long polling
app.get("/submission/:id", async (req, res) => {
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
  res.send(data);
});
// long polling

const getSubmissionStatus = async (id) => {
  const url = `${process.env.JUDGE0_API}/submissions/batch?tokens=${id}`;
  console.log("URL:", url);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
  const data = await response.json();
  // console.log("Response:", data);
  let count = 0;
  for (let i = 0; i < data.submissions.length; i++) {
    if (data.submissions[i].status.id < 3) {
      count++;
    }
  }
  if (count == 0) {
    console.log(data, "Final data");
    return data.submissions;
  } else {
    return await getSubmissionStatus(id);
  }
};

app.post("/pollSubmission/:id", async (req, res) => {
  const response = await getSubmissionStatus(req.params.id);
  console.log("Response:", response);
  // const body = await req.body;
  const { problemId, flag, languageId, sourceCode } = req.body;
  console.log("Request Body:", req.body);
  // console.log("Flag:", body.flag);
  console.log(flag, "Flag");
  if (flag === 1) {
    // create a submission entry on the database
    // first, create the final verdict from response
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
        problemId: problemId,
        userId: "1",
        language: languageId,
        code: sourceCode,
        verdict: finalVerdict,
        score: passedTestcasesCnt,
        executionTime: executionTime,
        memoryUsage: memory,
      },
    });
    console.log("Submission:", submission);
    console.log("submission created successfully. Verdict:", finalVerdict);
  }
  res.send(response);
});

app.post("/populateDatabase", async (req, res) => {
  async function main() {
    const user = await prisma.User.create({
      data: {
        username: "Alice",
        email: "abc@gmail.com",
        password: "123456",
      },
    });
    console.log(user);
  }

  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
  res.send("Database populated");
});

app.post("/submitProblem", async (req, res) => {
  // title       String
  // description String
  // difficulty  String    // "Easy", "Medium", "Hard"
  // max_time_limit Int    @default(2)
  // max_memory_limit Int  @default(262144) // 256MB in kBs
  // testCases   TestCase[]
  const { title, description, difficulty, max_time_limit, max_memory_limit } =
    req.body;
  console.log("Request Body:", req.body);
  // body = JSON.parse(body);
  // console.log("Parsed Body:", body);
  try {
    const problem = await prisma.Problem.create({
      data: {
        title,
        description,
        difficulty,
        max_time_limit,
        max_memory_limit,
      },
    });
    console.log(problem);
    res.status(200).json(problem);
  } catch (error) {
    console.error("Error creating problem:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/allProblems/:userId", async (req, res) => {
  const userId = req.params.userId;
  const submissionCount = await prisma.submission.groupBy({
    by: ["problemId"],
    select: {
      problemId: true,
      _count: {
        select: {
          id: true, // Count all submissions for the problem
        },
      },
    },
  });

  const problems = await prisma.problem.findMany({
    select: {
      id: true,
      title: true,
      difficulty: true,
      Problems: {
        where: {
          userId: userId, // Filter ProblemUser by specific user
        },
        select: {
          isSolved: true,
        },
      },
      tags: true,
      _count: {
        select: {
          submissions: {
            where: {
              verdict: "Accepted", // Count only correct submissions
            },
          },
        },
      },
    },
    where: {
      OR: [
        {
          contest: {
            status: {
              in: ["Ended", "Rating Update Pending"], // Include problems from ended or rating pending contests
            },
          },
        },
        {
          contest: null,
        },
      ],
    },
  });

  // Add submission count to each problem
  problems.forEach((problem) => {
    const submission = submissionCount.find(
      (sub) => sub.problemId === problem.id
    );
    problem.submissionCount = submission ? submission._count.id : 0;
    problem.isSolved =
      problem.Problems.length > 0 ? problem.Problems[0].isSolved : null;
    problem.acceptedCount = problem._count.submissions || 0;
    delete problem.Problems; // Remove the Problems array to clean up the response
    delete problem._count; // Remove the _count object to clean up the response
  });
  console.log(problems);
  res.status(200).json(problems);
});

app.get("/problem/:problemId/user/:userId", async (req, res) => {
  const { problemId, userId } = req.params;
  console.log("Problem ID:", problemId);
  const problem = await prisma.Problem.findUnique({
    where: {
      id: problemId,
    },
    include: {
      tags: true,
      testCases: {
        where: {
          isPublic: true,
        },
      },
      contest: true,
    },
  });
  const isSolved = await prisma.problemUser.findFirst({
    where: {
      problemId: problemId,
      userId: userId,
    },
    select: {
      isSolved: true,
    },
  });
  if (!isSolved) {
    problem.isSolved = null;
  } else problem.isSolved = isSolved.isSolved;

  if (!problem) {
    return res.status(404).json({ error: "Problem not found" });
  }
  console.log("Problem:", problem);
  if (
    problem.contestId != null &&
    problem.contest.status !== "Ended" &&
    problem.contest.status !== "Rating Update Pending"
  ) {
    return res
      .status(403)
      .json({ error: "Problem is part of an ongoing contest" });
  }
  console.log(problem);
  res.status(200).json(problem);
});

app.get("/getTestcases/:problemId", async (req, res) => {
  const problemId = req.params.problemId;
  console.log("Problem ID:", problemId);
  const testCases = await prisma.TestCase.findMany({
    where: {
      problemId: problemId,
      isPublic: true,
    },
  });
  console.log(testCases);
  res.status(200).json(testCases);
});

app.post("/submitTestCases/:probId", async (req, res) => {
  const { probId } = req.params;
  const testCases = req.body;
  console.log("Request Body:", testCases);
  try {
    const Testcases = testCases.map((testCase) => ({
      input: JSON.stringify(testCase.input),
      output: JSON.stringify(testCase.output),
      problemId: probId,
    }));
    const result = await prisma.TestCase.createMany({
      data: Testcases,
    });
    console.log("Test Cases:", result);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error creating problem:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/auth", async (req, res) => {
  const { email, displayName } = req.body;
  console.log("Request Body:", req.body);
  // if the user already exists, return the uuid
  const user = await prisma.User.findUnique({
    where: {
      email: email,
    },
  });
  if (user) {
    console.log("User already exists:", user);
    res.status(200).json(user);
  } else {
    // create a new user
    const newUser = await prisma.User.create({
      data: {
        email: email,
        name: displayName,
        username: "User_" + v4().trim().slice(0, 8),
        password: bcrypt.hashSync(v4(), 10),
      },
    });
    console.log("New User:", newUser);
    res.status(200).json(newUser);
  }
});

// Check if user already exists
app.post("/checkExistingUser", async (req, res) => {
  const { email } = req.body;
  console.log("Request Body:", req.body);
  // if the user already exists, return the uuid
  const user = await prisma.User.findUnique({
    where: {
      email: email,
    },
  });
  console.log("User:", user);

  if (user) {
    console.log("User already exists:", user);
    res.status(200).json(user);
  } else {
    res.status(200).json({});
  }
});

// Get all contests
app.get("/contests", async (req, res) => {
  try {
    const contests = await prisma.Contest.findMany({
      include: {
        participants: false,
      },
    });
    console.log("Contests:", contests);
    res.status(200).json(contests);
  } catch (error) {
    console.error("Error fetching contests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get contest by ID
app.get("/contest/:id", async (req, res) => {
  const contestId = req.params.id;
  console.log("Contest ID:", contestId);
  try {
    const contest = await prisma.Contest.findUnique({
      where: {
        id: contestId,
      },
    });
    console.log("Contest:", contest);
    res.status(200).json(contest);
  } catch (error) {
    console.error("Error fetching contest:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Check if user is registered for a contest
app.get("/contest/:contestId/participants/:userId", async (req, res) => {
  const { contestId, userId } = req.params;

  const result = await prisma.contestUser.findFirst({
    where: {
      contestId: contestId,
      userId: userId,
    },
  });
  console.log("Result:", result);
  if (result) {
    res.status(200).json({ isRegistered: true });
  } else {
    res.status(200).json({ isRegistered: false });
  }
});

app.post("/contest/:contestId/register/:userId", async (req, res) => {
  const { contestId, userId } = req.params;
  console.log("Contest ID:", contestId);
  console.log("User ID:", userId);
  try {
    // Check if contest status is Upcoming before registering
    const contest = await prisma.Contest.findUnique({
      where: { id: contestId },
      select: { status: true },
    });
    if (!contest || contest.status !== "Upcoming") {
      return res
        .status(400)
        .json({ error: "Contest is not open for registration." });
    }
    const result = await prisma.contestUser.create({
      data: {
        contestId: contestId,
        userId: userId,
      },
    });
    console.log("Result:", result);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching contest:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.post("/contest/:contestId/unregister/:userId", async (req, res) => {
  const { contestId, userId } = req.params;
  console.log("Contest ID:", contestId);
  console.log("User ID:", userId);
  try {
    const result = await prisma.contestUser.delete({
      where: {
        userId_contestId: {
          contestId: contestId,
          userId: userId,
        },
        contest: {
          status: "Upcoming", // Ensure the contest is still upcoming
        },
      },
    });
    console.log("Result:", result);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching contest:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/contest/:contestId/problems/user/:userId", async (req, res) => {
  const { contestId, userId } = req.params;
  console.log("Contest ID:", contestId);
  try {
    const contest = await prisma.Contest.findUnique({
      where: {
        id: contestId,
        status: {
          in: ["Ongoing", "Rating Update Pending", "Ended"],
        },
      },
    });
    console.log("Contest:", contest);
    if(!contest) {
      return res.status(404).json({ error: "Contest not found or not started yet" });
    }
    try {
      const problems = await prisma.Problem.findMany({
        where: {
          contestId: contestId,
        },
        orderBy: {
          problemScore: "asc",
        },
        select: {
          id: true,
          title: true,
          problemScore: true,
          difficulty: true,
          Problems: {
            where: {
              userId: userId,
              contestId: contestId,
            },
            select: {
              solvedInContest: true,
            },
          },
        },
      });
      // console.log("Problems:", problems);
      // Flatten solvedInContest for each problem
      problems.forEach((problem) => {
        problem.solvedInContest =
          problem.Problems.length > 0
            ? problem.Problems[0].solvedInContest
            : false;
        delete problem.Problems;
      });
      console.log("Problems:", problems);
      res.status(200).json(problems);
    } catch (error) {
      console.error("Error fetching problems:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  } catch (error) {
    console.error("Error fetching problems:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const checkIsRegistered = async (contestId, userId) => {
  const result = await prisma.contestUser.findFirst({
    where: {
      contestId: contestId,
      userId: userId,
    },
  });
  console.log("Result:", result);
  if (result) {
    return true;
  } else {
    return false;
  }
};

app.get(
  "/contest/:contestId/problem/:problemId/user/:userId",
  async (req, res) => {
    const { contestId, problemId, userId } = req.params;
    console.log("Contest ID:", contestId);
    console.log("Problem ID:", problemId);
    try {
      const isRegistered = await checkIsRegistered(contestId, userId);
      if (isRegistered) {
        const problem = await prisma.Problem.findUnique({
          include: {
            tags: true,
            testCases: {
              where: {
                isPublic: true,
              },
            },
          },
          where: {
            id: problemId,
            contestId: contestId,
          },
        });
        res.status(200).json(problem);
      } else {
        res.status(403).json({ error: "Contest is not started yet" });
      }
    } catch (error) {
      console.error("Error fetching problems:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.get("/submission/:submissionId/user/:userId", async (req, res) => {
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
    res.status(500).json({ error: "Internal server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Socket server is running on port ${PORT}`);
});

const generateAccessToken = async (user) => {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "60m" });
};

const generateRefreshToken = async (user) => {
  return jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
};

// login signup routes
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    const user = await prisma.User.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const accessToken = await generateAccessToken({
      id: user.id,
      email: user.email,
    });
    const refreshToken = await generateRefreshToken({
      id: user.id,
      email: user.email,
    });

    console.log("Refresh Token:", refreshToken);

    const updatedUser = await prisma.UserRefreshToken.update({
      where: { userId: user.id },
      data: { refreshToken },
    });
    console.log("User updated with refresh token:", updatedUser);
    if (!updatedUser) {
      return res
        .status(500)
        .json({ message: "Error updating user with refresh token." });
    }

    res
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      })
      .json({ accessToken, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

app.post("/auth/signup", async (req, res) => {
  const { username, email, password } = req.body;
  if (!email || !password || !username) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    const existingUser = await prisma.User.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return res.status(409).json({ message: "Email already exists." });
    }
  } catch (error) {
    console.error("Error checking existing user:", error);
    return res.status(500).json({ message: "Internal server error." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.User.create({
      data: {
        email,
        password: hashedPassword,
        username,
      },
    });

    const accessToken = await generateAccessToken({
      id: newUser.id,
      email: newUser.email,
    });
    const refreshToken = await generateRefreshToken({
      id: newUser.id,
      email: newUser.email,
    });

    console.log("Refresh Token:", refreshToken);

    const updatedUser = await prisma.userRefreshToken.create({
      data: {
        userId: newUser.id,
        refreshToken,
      },
    });
    if (!updatedUser) {
      return res
        .status(500)
        .json({ message: "Error updating user with refresh token." });
    } else console.log("User updated with refresh token:", updatedUser);

    res
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      })
      .json({ accessToken, user: { id: newUser.id, email: newUser.email } });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

app.post("/auth/refresh-token", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  console.log("Refresh Token:", refreshToken);
  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token not found." });
  }
  try {
    const user = await prisma.userRefreshToken.findUnique({
      where: { refreshToken },
    });
    if (!user) {
      return res.status(403).json({ message: "Invalid refresh token." });
    }
  } catch (error) {
    console.error("Error checking refresh token:", error);
    return res.status(500).json({ message: "Internal server error." });
  }

  jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    async (err, user) => {
      if (err) {
        return res.status(403).json({ message: "Invalid refresh token." });
      }

      const accessToken = await generateAccessToken({
        id: user.id,
        email: user.email,
      });
      res.json({
        accessToken: accessToken,
        user: { id: user.id, email: user.email },
      });
    }
  );
});

app.post("/auth/logout", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  console.log("Refresh Token:", refreshToken);
  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token not found." });
  }

  try {
    await prisma.UserRefreshToken.update({
      where: { refreshToken },
      data: { refreshToken: "" },
    });
    res
      .clearCookie("refreshToken")
      .json({ message: "Logged out successfully." });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

app.get("/contest/:contestId/users", async (req, res) => {
  const { contestId } = req.params;
  console.log("Contest ID:", contestId);
  try {
    // check if the cnontest has ended
    const contest = await prisma.Contest.findUnique({
      where: {
        id: contestId,
      },
    });
    if (contest.status == "Rating Update Pending") {
      return res.status(200).json({ data: "System testing is underway" });
    }
    if (contest.status !== "Ended") {
      return res.status(403).json({ error: "Contest has not ended yet" });
    }
  } catch (error) {
    console.error("Error fetching contest:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
  try {
    const contestUsers = await prisma.contestUser.findMany({
      where: {
        contestId: contestId,
      },
      orderBy: { actualRank: "asc" },
      select: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        rankGuess: true,
        actualRank: true,
        finishTime: true,
        score: true,
        penalty: true,
      },
    });

    // Now fetch all ProblemUser data for this contest
    const allProblemUsers = await prisma.problemUser.findMany({
      where: {
        contestId: contestId,
      },
    });
    // console.log("Contest Users:", contestUsers);
    console.log("All Problem Users hue hue hue:", allProblemUsers);

    // Group problemUser entries by userId
    const problemsByUser = new Map();

    for (const pu of allProblemUsers) {
      if (!problemsByUser.has(pu.userId)) {
        problemsByUser.set(pu.userId, []);
      }
      problemsByUser.get(pu.userId).push(pu);
    }

    // Attach problem data to each contest user
    const contestLeaderboard = contestUsers.map((userEntry) => ({
      ...userEntry,
      problems: problemsByUser.get(userEntry.user.id) || [],
    }));
    console.log("Contest Leaderboard:", contestLeaderboard);
    res.status(200).send(contestLeaderboard);
  } catch (error) {
    console.error("Error fetching contest ranking:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/contest/:contestId/startTime", async (req, res) => {
  const { contestId } = req.params;
  console.log("Contest ID:", contestId);
  try {
    const contest = await prisma.Contest.findUnique({
      where: {
        id: contestId,
      },
      select: {
        startTime: true,
      },
    });
    console.log("Contest Start Time:", contest.startTime);
    res.status(200).json(contest.startTime);
  } catch (error) {
    console.error("Error fetching contest start time:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// accept predicted ranking from user and save it to the database
app.post(
  "/contest/:contestId/user/:userId/rank/:predictedrank",
  async (req, res) => {
    const { contestId, userId, predictedrank } = req.params;

    const updatedUser = await prisma.contestUser.update({
      where: {
        userId_contestId: {
          userId: userId,
          contestId: contestId,
        },
        contest: {
          status: "Rank Guess Phase", // Ensure the contest is in the correct phase
        },
      },
      data: {
        rankGuess: parseInt(predictedrank, 10),
      },
    });

    if (!updatedUser) {
      return res.status(404).json({
        error: "Contest user not found or contest is not in rank guess phase.",
      });
    }
    console.log("Updated User:", updatedUser);
    res.status(200).json(updatedUser);
  }
);

function assignRanks(users) {
  // Sort users by their score in descending order and then by finish time in ascending order
  users.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score; // Sort by score in descending order
    }
    return a.finishTime - b.finishTime; // Sort by finish time in ascending order
  });

  users[0].actualRank = 1; // Assign rank to the first user
  let rank = 2;
  for (let i = 1; i < users.length; i++) {
    if (
      users[i].score === users[i - 1].score &&
      users[i].finishTime === users[i - 1].finishTime
    ) {
      // If the score and finish time are the same, assign the same rank
      users[i].actualRank = users[i - 1].actualRank;
    } else {
      users[i].actualRank = rank; // Assign the current rank
    }
    rank++;
  }

  // update the contestUser table with the actual rank
  users.forEach(async (user) => {
    await prisma.contestUser.update({
      where: {
        userId_contestId: {
          userId: user.userId,
          contestId: user.contestId,
        },
      },
      data: {
        actualRank: user.actualRank,
      },
    });
  });

  return users;
}

function assignRandomGuesses(users) {
  // Assign random rank guesses to user whose predicted rank is null
  users.forEach((user) => {
    if (user.rankGuess === null) {
      user.rankGuess = Math.floor(Math.random() * users.length) + 1; // Random rank between 1 and number of users
    }
  });
  return users;
}

function calculateRatingChanges(users) {
  const K = 60;
  const T = 2; // tolerance in rank difference
  const SIGMA = 400;

  const N = users.length;

  // Step 1: extract ratings
  for (let i = 0; i < N; i++) {
    users[i].rating = users[i].user.rating;
  }

  // Step 2: compute average rating (μ)
  const avgRating = users.reduce((sum, user) => sum + user.rating, 0) / N;

  // Step 3: calculate deltas
  let deltas = users.map((user) => {
    const { rankGuess, actualRank, rating } = user;
    const D = Math.abs(rankGuess - actualRank);

    // Rating volatility scaler
    const volatility = 1 / (1 + Math.pow((rating - avgRating) / SIGMA, 2));

    let delta;
    if (D <= T) {
      if (D === T) {
        delta = -K * 0.1 * volatility; // small penalty at edge
      } else {
        delta = K * (1 - D / T) * volatility;
      }
    } else {
      delta = -K * ((D - T) / (N - T)) * volatility;
    }
    return delta;
  });

  // Step 4: normalize to zero-sum
  const totalChange = deltas.reduce((sum, d) => sum + d, 0);
  const adjustment = -totalChange / N;

  // Step 5: apply rating changes
  users.forEach(async (user, index) => {
    const finalDelta = deltas[index] + adjustment;
    const roundedDelta = Math.round(finalDelta);
    const newRating = user.rating + roundedDelta;

    await prisma.contestUser.update({
      where: {
        userId_contestId: {
          userId: user.userId,
          contestId: user.contestId,
        },
      },
      data: {
        ratingChange: roundedDelta,
      },
    });

    await prisma.user.update({
      where: {
        id: user.userId,
      },
      data: {
        rating: newRating,
        pastRatings: {
          push: newRating,
        },
      },
    });

    console.log(
      `User ${user.username} | Δ: ${roundedDelta}, New Rating: ${newRating}`
    );
  });

  return users;
}

async function submitContest(contestId) {
  console.log("Contest ID:", contestId);
  try {
    // fetch all the users who participated in the contest
    const contestUsers = await prisma.contestUser.findMany({
      relationLoadStrategy: "join",
      where: {
        contestId: contestId,
      },
      include: {
        user: true,
      },
    });
    console.log("Contest Users:", contestUsers);
    if (contestUsers.length === 0) {
      throw new Error("No participants found.");
    }

    // assign ranks to the users
    const rankedUsers = assignRanks(contestUsers);
    console.log("Ranked Users:", rankedUsers);

    // assign random guesses to users who have not guessed their rank
    const usersWithGuesses = assignRandomGuesses(rankedUsers);
    console.log("Users with Guesses:", usersWithGuesses);

    // calculate rating changes
    const usersWithRatingChanges = calculateRatingChanges(usersWithGuesses);
    console.log("Users with Rating Changes:", usersWithRatingChanges);

    return usersWithRatingChanges;
  } catch (error) {
    console.error("Error ending contest:", error);
    throw error;
  }
}

app.get("/problem/:problemId/acceptance", async (req, res) => {
  const { problemId } = req.params;
  console.log("Problem ID:", problemId);
  const totalSubmisionCount = await prisma.Submission.count({
    where: {
      problemId: problemId,
    },
  });
  const acceptedSubmissionCount = await prisma.Submission.count({
    where: {
      problemId: problemId,
      verdict: "Accepted",
    },
  });
  const acceptanceRate = totalSubmisionCount
    ? (acceptedSubmissionCount / totalSubmisionCount) * 100
    : 0;
  console.log("Total Submissions:", totalSubmisionCount);
  console.log("Accepted Submissions:", acceptedSubmissionCount);
  console.log("Acceptance Rate:", acceptanceRate);
  res.status(200).json({
    totalSubmissions: totalSubmisionCount,
    acceptedSubmissions: acceptedSubmissionCount,
    acceptanceRate: acceptanceRate.toFixed(2) + "%",
  });
});

const getUserProblemCount = async (userId) => {
  console.log("User ID:", userId);

  const easyCount = await prisma.problemUser.count({
    where: {
      userId: userId,
      isSolved: true,
      problem: {
        difficulty: "Easy",
      },
      OR: [
        {
          contest: {
            status: {
              in: ["Ended", "Rating Update Pending"],
            },
          },
        },
        {
          contest: null,
        },
      ],
    },
  });

  console.log("Easy Count:", easyCount);

  const mediumCount = await prisma.problemUser.count({
    where: {
      userId: userId,
      isSolved: true,
      problem: {
        difficulty: "Medium",
      },
      OR: [
        {
          contest: {
            status: {
              in: ["Ended", "Rating Update Pending"],
            },
          },
        },
        {
          contest: null,
        },
      ],
    },
  });

  const hardCount = await prisma.problemUser.count({
    where: {
      userId: userId,
      isSolved: true,
      problem: {
        difficulty: "Hard",
      },
      OR: [
        {
          contest: {
            status: {
              in: ["Ended", "Rating Update Pending"],
            },
          },
        },
        {
          contest: null,
        },
      ],
    },
  });

  // Need count of each difficulty level problems
  const totalProblemsCount = await prisma.problem.groupBy({
    by: ["difficulty"],
    _count: {
      id: true,
    },
    where: {
      OR: [
        {
          contest: {
            status: {
              in: ["Ended", "Rating Update Pending"],
            },
          },
        },
        {
          contest: null,
        },
      ],
    },
  });

  const totalEasyCount =
    totalProblemsCount.find((problem) => problem.difficulty === "Easy")?._count
      .id || 0;
  const totalMediumCount =
    totalProblemsCount.find((problem) => problem.difficulty === "Medium")
      ?._count.id || 0;
  const totalHardCount =
    totalProblemsCount.find((problem) => problem.difficulty === "Hard")?._count
      .id || 0;

  return {
    easyCount,
    mediumCount,
    hardCount,
    totalEasyCount,
    totalMediumCount,
    totalHardCount,
  };
};

app.get("/user/:userId/problemCount", async (req, res) => {
  const { userId } = req.params;
  console.log("User ID:", userId);
  try {
    const problemCount = await getUserProblemCount(userId);
    console.log("Problem Count:", problemCount);
    res.status(200).json(problemCount);
  } catch (error) {
    console.error("Error fetching problem count:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/user/:userId/problem/:problemId/submission", async (req, res) => {
  const { userId, problemId } = req.params;
  try {
    const result = await prisma.submission.findMany({
      where: {
        userId: userId,
        problemId: problemId,
      },
      select: {
        verdict: true,
        createdAt: true,
        language: true,
        executionTime: true,
        memoryUsage: true,
        id: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    console.log("Submissions for user:", userId, "and problem:", problemId);
    console.log("Result:", result);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/contest/:contestId/participants", async (req, res) => {
  // get the number of participants in the contest
  const { contestId } = req.params;
  console.log("Contest ID:", contestId);
  try {
    const participantsCount = await prisma.contestUser.count({
      where: {
        contestId: contestId,
      },
    });
    console.log("Participants Count:", participantsCount);
    res.status(200).json({ participantsCount });
  } catch (error) {
    console.error("Error fetching participants count:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user data for the profile page
app.get("/user/:userName", async (req, res) => {
  const { userName } = req.params;
  console.log("User Name he he he :", userName);

  // Fetch user data along with their recent submissions
  try {
    const user = await prisma.user.findUnique({
      where: { username: userName },
      select: {
        id: true,
        username: true,
        email: true,
        rating: true,
        pastRatings: true,
        submissions: {
          orderBy: { createdAt: "desc" },
          // take: 10, // Fetch only the last 10 submissions
          select: {
            id: true,
            verdict: true,
            createdAt: true,
            problem: {
              select: {
                title: true,
                difficulty: true,
              },
            },
          },
        },
      },
    });
    const problemCount = await getUserProblemCount(user.id);
    user.problemCount = problemCount;
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    console.log("User Data:", user);
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// get user details for the setting page 
app.get("/user/:userId/details", async (req, res) => {
  const { userId } = req.params;
  console.log("User ID:", userId);
  try {
    const user = await prisma.User.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        rating: true,
        pastRatings: true,
      },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    console.log("User Details:", user);
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});