const prisma = require("../services/prisma");
// const { io } = require("../server");
const {
  scheduleUpcomingContest,
  scheduleOngoingContest,
  scheduleRankGuessContest,
  scheduleRatingPendingContest,
} = require("../sockets");

const {
  checkIsRegistered,
  getContestStartTime,
} = require("../services/contest");

async function getAllContests(req, res) {
  try {
    const contests = await prisma.Contest.findMany({
      include: {
        participants: false,
      },
      cacheStrategy: { ttl: 5 * 60 }, // cache for 5 minutes
    });
    // console.log("Contests:", contests);
    return res.json(contests);
  } catch (error) {
    console.error("Error fetching contests:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch contests",
      error: error.message,
    });
  }
}

async function getContestById(req, res) {
  const contestId = req.params.id;
  // console.log("Contest ID:", contestId);
  try {
    const contest = await prisma.Contest.findUnique({
      where: {
        id: contestId,
      },
      // cacheStrategy: { ttl: 5 * 60 }, // cache for 5 minutes
    });
    // console.log("Contest:", contest);
    return res.status(200).json(contest);
  } catch (error) {
    console.error("Error fetching contest:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function isContestRegistered(req, res) {
  const { contestId, userId } = req.params;

  res.status(200).json({
    isRegistered: await checkIsRegistered(contestId, userId),
  });
}

async function registerContest(req, res) {
  const { contestId, userId } = req.params;
  // console.log("Contest ID:", contestId);
  // console.log("User ID:", userId);
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
    // Check if user is already registered
    if (await checkIsRegistered(contestId, userId)) {
      return res
        .status(400)
        .json({ error: "User is already registered for this contest." });
    }
    const result = await prisma.contestUser.create({
      data: {
        contestId: contestId,
        userId: userId,
      },
    });
    // console.log("Result:", result);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching contest:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function unregisterContest(req, res) {
  const { contestId, userId } = req.params;
  // console.log("Contest ID:", contestId);
  // console.log("User ID:", userId);
  if (!(await checkIsRegistered(contestId, userId))) {
    return res
      .status(400)
      .json({ error: "User is not registered for this contest." });
  }
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
    // console.log("Result:", result);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching contest:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getContestProblems(req, res) {
  const { contestId, userId } = req.params;
  // console.log("Contest ID for getting all probs:", contestId);
  try {
    const contest = await prisma.Contest.findUnique({
      where: {
        id: contestId,
        status: {
          in: ["Ongoing", "Rating Update Pending", "Ended"],
        },
      },
    });
    // console.log("Contest:", contest);
    if (!contest) {
      return res
        .status(404)
        .json({ error: "Contest not found or not started yet" });
    }

    if (
      contest.status === "Ongoing" &&
      !(await checkIsRegistered(contestId, userId))
    ) {
      return res
        .status(403)
        .json({ error: "User is not registered for this contest." });
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
              score: true,
              penalty: true,
            },
          },
        },
        cacheStrategy: { ttl: 5 * 60 }, // cache for 5 minutes
      });
      // console.log("Problems:", problems);
      // Flatten solvedInContest for each problem
      problems.forEach((problem) => {
        problem.solvedInContest =
          problem.Problems.length > 0
            ? problem.Problems[0].solvedInContest
            : false;

        problem.penalty =
          problem.Problems.length > 0 ? problem.Problems[0].penalty : 0;
        delete problem.Problems;
      });
      // console.log("Problems:", problems);
      return res.status(200).json(problems);
    } catch (error) {
      console.error("Error fetching problems:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  } catch (error) {
    console.error("Error fetching problems:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function getContestProblem(req, res) {
  const { contestId, problemId, userId } = req.params;
  // console.log("Contest ID:", contestId);
  // console.log("Problem ID:", problemId);
  const contest = await prisma.Contest.findUnique({
    where: {
      id: contestId,
      status: {
        in: ["Ongoing", "Rating Update Pending", "Ended"],
      },
    },
  });
  // console.log("Contest:", contest);
  if (!contest) {
    return res
      .status(404)
      .json({ error: "Contest not found or not started yet" });
  }

  if (
    contest.status === "Ongoing" &&
    !(await checkIsRegistered(contestId, userId))
  ) {
    return res
      .status(403)
      .json({ error: "User is not registered for this contest." });
  }
  try {
    const problem = await prisma.Problem.findUnique({
      include: {
        // tags: true,
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
      cacheStrategy: { ttl: 5 * 60 }, // cache for 5 minutes
    });
    return res.status(200).json(problem);
  } catch (error) {
    console.error("Error fetching problems:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function getRankings(req, res) {
  const { contestId } = req.params;
  // console.log("Contest ID:", contestId);
  try {
    // check if the cnontest has ended
    const contest = await prisma.Contest.findUnique({
      where: {
        id: contestId,
      },
      select: {
        status: true,
      },
      // cacheStrategy: { ttl: 5 * 60 }, // cache for 5 minutes
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
            pfpId: true,
          },
        },
        rankGuess: true,
        actualRank: true,
        finishTime: true,
        score: true,
        penalty: true,
      },
      cacheStrategy: {
        ttl: 10 * 60,
      },
    });

    // Now fetch all ProblemUser data for this contest
    const allProblemUsers = await prisma.problemUser.findMany({
      where: {
        contestId: contestId,
      },
      cacheStrategy: {
        ttl: 10 * 60,
      },
    });
    // console.log("Contest Users:", contestUsers);
    // console.log("All Problem Users hue hue hue:", allProblemUsers);

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
    // console.log("Contest Leaderboard:", contestLeaderboard);
    return res.status(200).send(contestLeaderboard);
  } catch (error) {
    console.error("Error fetching contest ranking:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function getStartTime(req, res) {
  const { contestId } = req.params;
  // console.log("Contest ID:", contestId);
  try {
    const startTime = await getContestStartTime(contestId);
    if (!startTime) {
      return res.status(404).json({ error: "Contest not found" });
    }
    return res.status(200).json(startTime);
  } catch (error) {
    console.error("Error fetching contest start time:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function submitPredictedRank(req, res) {
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
  // console.log("Updated User:", updatedUser);
  return res.status(200).json(updatedUser);
}

async function getParticipantsCount(req, res) {
  // get the number of participants in the contest
  const { contestId } = req.params;
  // console.log("Contest ID:", contestId);
  try {
    const participantsCount = await prisma.contestUser.count({
      where: {
        contestId: contestId,
      },
      cacheStrategy: {
        ttl: 10,
      },
    });
    // console.log("Participants Count:", participantsCount);
    return res.status(200).json({ participantsCount });
  } catch (error) {
    console.error("Error fetching participants count:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function getUserRankGuess(req, res) {
  const { contestId, userId } = req.params;
  // console.log("Contest ID:", contestId);
  // console.log("User ID:", userId);
  try {
    const user = await prisma.contestUser.findUnique({
      where: {
        userId_contestId: {
          userId: userId,
          contestId: contestId,
        },
      },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found in contest" });
    }
    return res.status(200).json({ rankGuess: user.rankGuess });
  } catch (error) {
    console.error("Error fetching user rank guess:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// async function getUserContestStats(req, res) {
//   const { contestId, userId } = req.params;
//   console.log("Contest ID:", contestId);
//   console.log("User ID:", userId);
//   try {
//     const user = await prisma.contestUser.findUnique({
//       where: {
//         userId_contestId: {
//           userId: userId,
//           contestId: contestId,
//         },
//       },
//       select: {
//         rankGuess: true,
//         problems: {
//           select: {
//             problemId: true,
//             solvedInContest: true,
//             score: true,
//             penalty: true,
//           },
//         },
//       },
//     });
//     if (!user) {
//       return res.status(404).json({ error: "User not found in contest" });
//     }

//     const totalScore = user.problems.reduce((acc, problem) => {
//       return acc + (problem.solvedInContest ? problem.score : 0);
//     }, 0);
//     const totalPenalty = user.problems.reduce((acc, problem) => {
//       return acc + (problem.solvedInContest ? problem.penalty : 0);
//     }, 0);
//     return res.status(200).json({
//       rankGuess: user.rankGuess,
//       problems: user.problems,
//       totalScore,
//       totalPenalty,
//     });
//   } catch (error) {
//     console.error("Error fetching user contest stats:", error);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// }

module.exports = {
  getAllContests,
  getContestById,
  getContestProblems,
  getParticipantsCount,
  isContestRegistered,
  registerContest,
  unregisterContest,
  getContestProblem,
  getRankings,
  getStartTime,
  submitPredictedRank,
  getUserRankGuess,
};
