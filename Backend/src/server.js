const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

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
      "source_code": source_code,
      "language_id": language_id,
      "stdin": testCase.stdin,
      "expected_output": testCase.stdout,
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
    body: JSON.stringify({ "submissions": submissions }),
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
app.get("/pollSubmission/:id", async (req, res) => {
  const url = `${process.env.JUDGE0_API}/submissions/batch?tokens=${req.params.id}`;
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
