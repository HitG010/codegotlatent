const prisma = require("../services/prisma");
const { uploadToGCS } = require("../services/gcs");
const dotenv = require("dotenv");
dotenv.config();

async function addTestcase(req, res) {
  const { problemId, input, stdin, output, stdout, isPublic } = req.body;
  // console.log("Problem ID:", problemId);
  const inputSize = Buffer.byteLength(stdin, "utf8");
  const outputSize = Buffer.byteLength(stdout, "utf8");
  const totalSize = inputSize + outputSize;

  // console.log("Total Size:", totalSize);
  const testcase = await prisma.testCase.create({
    data: {
      problemId,
      isGCS: totalSize > process.env.SIZE_LIMIT,
    },
  });

  const id = testcase.id;
  if (totalSize > process.env.SIZE_LIMIT) {
    const stdinPath = `testcases/${id}/stdin.txt`;
    const stdoutPath = `testcases/${id}/stdout.txt`;

    await uploadToGCS(process.env.BUCKET_NAME, stdinPath, stdin);
    await uploadToGCS(process.env.BUCKET_NAME, stdoutPath, stdout);

    await prisma.testCase.update({
      where: { id: id },
      data: {
        input: JSON.stringify(input),
        stdin: stdinPath,
        stdout: stdoutPath,
        output: JSON.stringify(output),
        isPublic: isPublic || false,
      },
    });
    console.log("Test case saved to GCS:", id);
    res.status(201).json({ message: "Test case saved to GCS", id: id });
  } else {
    await prisma.testCase.update({
      where: { id: id },
      data: {
        input: JSON.stringify(input),
        stdin: stdin,
        stdout: stdout,
        output: JSON.stringify(output),
        isPublic: isPublic || false,
      },
    });
    console.log("Test case saved locally:", id);
    res.status(201).json({ message: "Test case saved locally", id: id });
  }
}

async function addProblem(req, res) {
  let {
    title,
    description,
    difficulty,
    problemScore,
    contestId,
    max_time_limit,
    max_memory_limit,
    tags,
    testCases,
  } = req.body;
  if (!title || !description || !difficulty) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!contestId) {
    contestId = null; // Allow for problems not associated with a contest
  }
  let intProbScore = parseInt(problemScore);
  try {
    const problem = await prisma.problem.create({
      data: {
        title,
        description,
        difficulty,
        problemScore: intProbScore,
        contestId,
        max_time_limit,
        max_memory_limit,
        tags: {
          connect: tags.map((tagId) => ({ id: tagId })), // connect existing tags
        },
        testCases: {
          create: testCases.map((testCase) => ({
            input: JSON.stringify(testCase.input),
            stdin: testCase.stdin,
            output: testCase.output,
            stdout: testCase.stdout,
            isPublic: testCase.isPublic || false,
          })),
        },
      },
    });

    console.log("Problem Created:", problem);
    res.status(201).json(problem);
  } catch (error) {
    console.error("Error creating problem:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function editProblem(req, res) {
  const { id } = req.params;
  const {
    title,
    description,
    difficulty,
    problemScore,
    contestId,
    max_time_limit,
    max_memory_limit,
    tags,
  } = req.body;

  try {
    let intProbScore = parseInt(problemScore);
    const problem = await prisma.problem.update({
      where: { id },
      data: {
        title,
        description,
        difficulty,
        problemScore: intProbScore,
        contestId,
        max_time_limit,
        max_memory_limit,
        tags: {
          set: tags.map((tagId) => ({ id: tagId.id })), // replace existing tags
        },
      },
    });

    console.log("Problem Updated:", problem);
    res.status(200).json(problem);
  } catch (error) {
    console.error("Error updating problem:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  addTestcase,
  addProblem,
  editProblem,
};
