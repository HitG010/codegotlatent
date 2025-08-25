const prisma = require("../services/prisma");

async function allProblems(req, res) {
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
    cacheStrategy: {
      ttl: 2 * 60,
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
    cacheStrategy: {
      ttl: 1 * 60,
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
  // console.log(problems);
  return res.json(problems);
}

async function getProblem(req, res) {
  const { problemId, userId } = req.params;
  // console.log("Problem ID:", problemId);
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
    cacheStrategy: {
      ttl: 60 * 60,
      swr: 5 * 60,
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
  // console.log("Problem:", problem);
  if (
    problem.contestId != null &&
    problem.contest.status !== "Ended" &&
    problem.contest.status !== "Rating Update Pending"
  ) {
    return res
      .status(403)
      .json({ error: "Problem is part of an ongoing contest" });
  }
  // console.log(problem);
  return res.json(problem);
}

async function acceptanceRate(req, res) {
  const { problemId } = req.params;
  // console.log("Problem ID:", problemId);
  const totalSubmisionCount = await prisma.Submission.count({
    where: {
      problemId: problemId,
    },
    cacheStrategy: {
      ttl: 2 * 60,
      swr: 1 * 60,
    },
  });
  const acceptedSubmissionCount = await prisma.Submission.count({
    where: {
      problemId: problemId,
      verdict: "Accepted",
    },
    cacheStrategy: {
      ttl: 2 * 60,
      swr: 1 * 60,
    },
  });
  const acceptanceRate = totalSubmisionCount
    ? (acceptedSubmissionCount / totalSubmisionCount) * 100
    : 0;
  // console.log("Total Submissions:", totalSubmisionCount);
  // console.log("Accepted Submissions:", acceptedSubmissionCount);
  // console.log("Acceptance Rate:", acceptanceRate);
  return res.status(200).json({
    totalSubmissions: totalSubmisionCount,
    acceptedSubmissions: acceptedSubmissionCount,
    acceptanceRate: acceptanceRate.toFixed(2) + "%",
  });
}

async function getAllTags(req, res) {
  try {
    const allTags = await prisma.problemTags.findMany({
      select: { id: true, tag: true },
      cacheStrategy: {
        ttl: 60 * 60,
      },
    });
    return res.json(allTags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function deleteAllTestcases(req, res) {
  const { problemId } = req.params;
  // console.log("Problem ID:", problemId);
  try {
    const deletedTestCases = await prisma.testCase.deleteMany({
      where: {
        problemId: problemId,
      },
    });
    // console.log("Deleted Test Cases:", deletedTestCases);
    res.status(200).json(deletedTestCases);
  } catch (error) {
    console.error("Error deleting test cases:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  allProblems,
  getProblem,
  acceptanceRate,
  getAllTags,
  deleteAllTestcases,
};
