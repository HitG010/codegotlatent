const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const v4 = require("uuid").v4;
const bcrypt = require("bcrypt");

const { PrismaClient } = require("@prisma/client/edge");
const { withAccelerate } = require("@prisma/extension-accelerate");

const prisma = new PrismaClient().$extends(withAccelerate());

// const submissionRoutes = require("./routes/index");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
// app.use("/api", submissionRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get("/hello", (req, res) => {
  res.json({ message: "Hello World" });
});

app.put("/callback", (req, res) => {
  console.log("Callback received:", req.body);
  res.status(200).send("OK");
});

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
  if(flag === 1) {
    // create a submission entry on the database
    // first, create the final verdict from response
    let finalVerdict = "Accepted";
    let passedTestcasesCnt = 0;
    let executionTime = 0;
    let memory = 0;
    // let errorToken = null;
    for(let i = 0; i < response.length; i++) {
      if(response[i].status.id > 3) {
        finalVerdict = response[i].status.description;
      }
      else if(response[i].status.id == 3) {
        passedTestcasesCnt++;
      }
      executionTime += parseFloat(response[i].time);
      memory += response[i].memory;
    }

    const submission = await prisma.Submission.create({
      data: {
        problemId: problemId,
        userId: '1',
        language: languageId,
        code: sourceCode,
        verdict: finalVerdict,
        score: passedTestcasesCnt,
        executionTime : executionTime,
        memoryUsage: memory,
      }
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

app.get("/allProblems", async (req, res) => {
  const problems = await prisma.Problem.findMany();
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

app.post('/auth', async (req, res) => {
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
    res.status(200).json(user.id);
  } else {
    // create a new user
    const newUser = await prisma.User.create({
      data: {
        email: email,
        username: displayName,
        password: bcrypt.hashSync(v4(), 10)
      },
    });
    console.log("New User:", newUser);
    res.status(200).json(newUser.id);
  }
});
