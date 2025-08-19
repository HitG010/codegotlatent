const prisma = require("../services/prisma");

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

module.exports = {
  getUserProblemCount,
};
