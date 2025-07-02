const primsa = require("../services/prisma");

async function allProblems(req, res) {
  const userId = req.params.userId;
  const submissionCount = await primsa.submission.groupBy({
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
  return res.json({
    success: true,
    message: "All problems fetched successfully",
    data: problems,
  });
}

async function getProblem(req, res) {
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
  const isSolved = await primsa.problemUser.findFirst({
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
  return res.json({
    success: true,
    message: "Problem fetched successfully",
    data: problem,
  });
}

module.exports = {
  allProblems,
  getProblem,
};
