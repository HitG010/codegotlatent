const { get } = require("http");
const prisma = require("../services/prisma");

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

const getContestStartTime = async (contestId) => {
  const contest = await prisma.contest.findUnique({
    where: {
      id: contestId,
    },
    select: {
      startTime: true,
    },
  });
  if (!contest) {
    throw new Error("Contest not found");
  }
  return contest.startTime;
};

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


module.exports = {
  updateContestUser,
  checkIsRegistered,
  getContestStartTime,
  assignRanks,
  assignRandomGuesses,
  calculateRatingChanges,
  submitContest,
};
