const prisma = require("../services/prisma");
const { getUserProblemCount } = require("../services/user");

async function getProblemCount(req, res) {
  const { userId } = req.params;
  // console.log("User ID:", userId);
  try {
    const problemCount = await getUserProblemCount(userId);
    // console.log("Problem Count:", problemCount);
    return res.status(200).json(problemCount);
  } catch (error) {
    console.error("Error fetching problem count:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function getUserProblemSubmissions(req, res) {
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
      cacheStrategy: { ttl: 30 }, // cache for 60 seconds
    });
    // console.log("Submissions for user:", userId, "and problem:", problemId);
    // console.log("Result:", result);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function getUserDetailsFromUsername(req, res) {
  const { userName } = req.params;
  // console.log("User Name he he he :", userName);

  // Fetch user data along with their recent submissions
  try {
    const user = await prisma.user.findUnique({
      where: { username: userName },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        Bio: true,
        Location: true,
        pfpId: true,
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
      // cacheStrategy: { ttl: 5 * 60, swr: 5 * 60, tags: [`user:${user.id}`] }, // cache for 5 minutes
    });
    const problemCount = await getUserProblemCount(user.id);
    user.problemCount = problemCount;
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // console.log("User Data:", user);
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getUserDetails(req, res) {
  const { userId } = req.params;
  // console.log("User ID:", userId);
  try {
    const user = await prisma.User.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        Bio: true,
        Location: true,
        pfpId: true,
      },
      // cacheStrategy: {
      //   ttl: 5 * 60,
      //   swr: 5 * 60,
      //   tags: [`userDetails_${userId}`],
      // }, // cache for 5 minutes
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // console.log("User Details:", user);
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function updateUserDetails(req, res) {
  const { userId } = req.params;
  const { username, name, Bio, Location, pfpId } = req.body;
  // console.log("User ID:", userId);

  // Check if the username already exists
  const existingUser = await prisma.user.findUnique({
    where: { username: username },
  });
  if (existingUser && existingUser.id !== userId) {
    return res.status(400).json({ error: "Username already exists" });
  }

  try {
    // Invalidate cache
    // try {
    //   await prisma.$accelerate.invalidate({
    //     tags: [`userDetails_${userId}`],
    //   });
    // } catch (error) {
    //   console.error("Error invalidating cache:", error);
    // }
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        username,
        name,
        Bio,
        Location,
        pfpId,
      },
    });
    // console.log("Updated User:", updatedUser);
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  getProblemCount,
  getUserProblemSubmissions,
  getUserDetailsFromUsername,
  getUserDetails,
  updateUserDetails,
};
