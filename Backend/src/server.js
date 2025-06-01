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

async function scheduleContests() {
  const contests = await prisma.Contest.findMany({
    where: {
      status: "Upcoming",
    },
  });
  console.log("Contests:", contests);
  contests.forEach((contest) => {
    const startTime = new Date(contest.startTime);
    const endTime = new Date(contest.endTime);
    console.log("Start Time:", startTime);
    console.log("End Time:", endTime);
    // rule.tz = "Asia/Kolkata";
    const date = startTime.getDate();
    const month = startTime.getMonth(); // 0-11
    const year = startTime.getFullYear();
    const hour = startTime.getHours();
    const minute = startTime.getMinutes();
    const second = startTime.getSeconds();
    console.log("start time:", startTime);
    // const date = new Date(start);
    const startDate = new Date(year, month, date, hour, minute, second);
    console.log("Start Time:", startTime);
    schedule.scheduleJob(startDate, async () => {
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
    // schedule the 2 min eloped event
    const elopedTime = new Date(startTime.getTime() + 2 * 60 * 1000);
    const elopedRule = new schedule.RecurrenceRule();
    // elopedRule.tz = "Etc/UTC";
    const elopeddate = elopedTime.getDate();
    const elopedmonth = elopedTime.getMonth(); // 0-11
    const elopedyear = elopedTime.getFullYear();
    const elopedhour = elopedTime.getHours();
    const elopedminute = elopedTime.getMinutes();
    const elopedsecond = elopedTime.getSeconds();
    console.log("Eloped Rule:", elopedRule);
    const elopedDate = new Date(
      elopedyear,
      elopedmonth,
      elopeddate,
      elopedhour,
      elopedminute,
      elopedsecond
    );
    schedule.scheduleJob(elopedDate, async () => {
      console.log("Contest 2 min eloped:", contest.name);
      io.emit("2minEloped", { contestId: contest.id });
    });
    const endRule = new schedule.RecurrenceRule();
    // endRule.tz = "Etc/UTC";
    const enddate = endTime.getDate();
    const endmonth = endTime.getMonth(); // 0-11
    const endyear = endTime.getFullYear();
    const endhour = endTime.getHours();
    const endminute = endTime.getMinutes();
    const endsecond = endTime.getSeconds();
    console.log("End Rule:", endRule);
    const endDate = new Date(
      endyear,
      endmonth,
      enddate,
      endhour,
      endminute,
      endsecond
    );
    schedule.scheduleJob(endDate, async () => {
      console.log("Contest ended:", contest.name);
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

    // update the rankings after 30 seconds after the contest ends
    schedule.scheduleJob(new Date(endDate.getTime() + 30 * 1000), async () => {
      console.log("Updating contest rankings:", contest.name);
      submitContest(contest.id);
    });
  });
}

// scheduleContests();
// CALL THE FUNCTION TO SCHEDULE CONTESTS AFTER 1 DAY FOR AUTOMATICALLY SCHEDULING NEWLY CREATED CONTESTS IN THE DATABASE IN FUTURE
// cron.schedule("0 0 * * *", async () => {
//   console.log("Scheduling contests");
//   await scheduleContests();
// });

// create a similiar cron job for every 1 min
cron.schedule("*/1 * * * *", async () => {
  console.log("Scheduling contests");
  await scheduleContests();
});

app.put("/callback", (req, res) => {
  console.log("Callback received:", req.body);
  res.status(200).send("OK");
});

app.post("/submitContestCode", async (req, res) => {
  const body = await req.body;
  const { problem_id, language_id, source_code, contest_id, userId } = body;

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
  if (contest_id !== null) {
    const isCorrect = finalVerdict === "Accepted";
    const finishTime = await prisma.problemUser.findFirst({
      where: {
        userId: userId,
        problemId: problem_id,
        contestId: contest_id,
      },
      select: {
        finishedAt: true,
      },
    });
    console.log("Finish Time:", finishTime);
    const updatedContestProblem = await prisma.problemUser.upsert({
      where: {
        userId_problemId: {
          userId: userId,
          problemId: problem_id,
        },
        contestId: contest_id,
      },
      update: {
        isSolved: isCorrect,
        solvedInContest: isCorrect,
        score: isCorrect
          ? (
              await prisma.problem.findUnique({ where: { id: problem_id } })
            )?.problemScore || 0
          : 0,
        penalty: {
          increment: isCorrect ? 0 : 1,
        },
        finishedAt:
          finishTime && finishTime.finishedAt
            ? finishTime.finishedAt
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
        // Take the first submission time as the finished time
        finishedAt: isCorrect ? submission.createdAt : null,
      },
    });
    console.log(updatedContestProblem);
    // fetch contest start time
    const contestStartTime = await prisma.Contest.findUnique({
      where: {
        id: contest_id,
      },
      select: {
        startTime: true,
      },
    });
    console.log("Contest Start Time:", contestStartTime);
    const updatedContestUser = await updateContestUser(
      contest_id,
      userId,
      contestStartTime.startTime
    );
  } else {
    const isCorrect = finalVerdict === "Accepted";
    const updatedProblemUser = await prisma.problemUser.upsert({
      where: {
        userId_problemId: {
          userId: userId,
          problemId: problem_id,
        },
      },
      update: {
        isSolved: isCorrect,
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
  const contestProblems = await prisma.problemUser.findMany({
    where: {
      contestId: contestId,
      userId: userId,
    },
  });
  console.log("Contest Problems:", contestProblems);
  let totalScore = 0;
  let totalPenalty = 0;
  let totalFinishTime = contestStartTime;
  contestProblems.forEach((contestProblem) => {
    totalScore += contestProblem.score;
    totalFinishTime = Math.max(
      contestProblem.finishedAt ? contestProblem.finishedAt : 0,
      totalFinishTime
    );
    totalPenalty += contestProblem.penalty;
  });
  // add 5 mins for each penalty
  if (totalFinishTime != 0) totalFinishTime += totalPenalty * 5 * 60 * 1000;
  const updatedContestUser = await prisma.contestUser.update({
    where: {
      userId_contestId: {
        userId: userId,
        contestId: contestId,
      },
    },
    data: {
      score: totalScore,
      penalty: totalPenalty,
      finishTime: new Date(totalFinishTime),
    },
  });
  return updatedContestUser;
};

app.post("/batchSubmission", async (req, res) => {
  const body = await req.body;
  const { testcases, language_id, source_code } = body;

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
  console.log("Response:", data);
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
            status: "Ended",
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

app.get("/problem/:id", async (req, res) => {
  const problemId = req.params.id;
  console.log("Problem ID:", problemId);
  const problem = await prisma.Problem.findUnique({
    where: {
      id: problemId,
    },
    include: {
      tags: true,
    }
  });
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

app.get("/contests", async (req, res) => {
  try {
    const contests = await prisma.Contest.findMany({
      where: {
        status: "Upcoming",
      },
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
      },
    });
    console.log("Result:", result);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching contest:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/contest/:contestId/problems", async (req, res) => {
  const { contestId } = req.params;
  console.log("Contest ID:", contestId);
  try {
    const contest = await prisma.Contest.findUnique({
      where: {
        id: contestId,

        // check if the time of req is greater than the start time of the contest + 2mins
        startTime: {
          lte: new Date(Date.now() - 2 * 60 * 1000),
        },
      },
    });
    console.log("Contest:", contest);
    if (contest.status === "Ongoing") {
      try {
        const problems = await prisma.Problem.findMany({
          where: {
            contestId: contestId,
          },
          orderBy: {
            problemScore: "asc",
          },
        });
        console.log("Problems:", problems);
        res.status(200).json(problems);
      } catch (error) {
        console.error("Error fetching problems:", error);
        res.status(500).json({ error: "Internal server error" });
      }
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
    if (contest.status === "Ended") {
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
  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token not found." });
  }

  try {
    await prisma.User.update({
      where: { refreshToken },
      data: { refreshToken: null },
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
      include: {
        user: true,
      },
      orderBy: [{ score: "desc" }, { finishTime: "asc" }, { penalty: "asc" }],
    });
    console.log("Contest Users:", contestUsers);
    // convert this contestUsers to a list
    const contestUsersList = contestUsers.map((contestUser) => {
      return {
        userId: contestUser.userId,
        username: contestUser.user.username,
        score: contestUser.score,
        finishTime: contestUser.finishTime,
        penalty: contestUser.penalty,
      };
    });
    res.status(200).send(contestUsersList);
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
    let { contestId, userId, predictedrank } = req.params;
    // const { predictedRanking } = req.body;
    console.log("Contest ID:", contestId);
    console.log("User ID:", userId);
    console.log("Predicted Ranking:", predictedrank);
    let randomrank = 0;
    // fetch the number of users in the contest
    try {
      const contest = await prisma.Contest.findUnique({
        where: {
          id: contestId,
        },
        select: {
          participants: true,
        },
      });
      console.log("Contest Participants:", contest.participants);
      if (predictedrank == 0) {
        randomrank =
          Math.floor(Math.random() * contest.participants.length) + 1;
        console.log("Random Rank:", randomrank);
        predictedrank = randomrank;
      }
    } catch (error) {
      console.error("Error fetching contest participants:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
    try {
      const result = await prisma.contestUser.update({
        where: {
          userId_contestId: {
            userId: userId,
            contestId: contestId,
          },
        },
        data: {
          rankGuess: parseInt(predictedrank),
        },
      });
      console.log("Result:", result);
      res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching contest ranking:", error);
      res.status(500).json({ error: "Internal server error" });
    }
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

    // calculate rating changes
    const usersWithRatingChanges = calculateRatingChanges(rankedUsers);
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

app.get("/user/:userId/problemCount", async (req, res) => {
  const { userId } = req.params;
  console.log("User ID:", userId);
  const easyCount = await prisma.problemUser.count({
    where: {
      userId: userId,
      isSolved: true,
      problem: {
        difficulty: "Easy",
      },
    },
  });

  const mediumCount = await prisma.problemUser.count({
    where: {
      userId: userId,
      isSolved: true,
      problem: {
        difficulty: "Medium",
      },
    },
  });

  const hardCount = await prisma.problemUser.count({
    where: {
      userId: userId,
      isSolved: true,
      problem: {
        difficulty: "Hard",
      },
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
            status: "Ended",
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

  return res.status(200).json({
    totalEasyCount: totalEasyCount,
    totalMediumCount: totalMediumCount,
    totalHardCount: totalHardCount,
    easyCount: easyCount,
    mediumCount: mediumCount,
    hardCount: hardCount,
  });
});
