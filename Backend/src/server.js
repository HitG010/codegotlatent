const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const v4 = require("uuid").v4;
const bcrypt = require("bcrypt");
const schedule = require("node-schedule");
const cron = require("node-cron");
const { Server } = require("socket.io");
const prisma = require("./services/prisma");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const axios = require("axios");
const startContestSchedulers = require("./sockets");
// const { Storage } = require("@google-cloud/storage");

const problemRouter = require("./routes/problems");
const submissionRouter = require("./routes/submissions");
const userRouter = require("./routes/user");
const adminRouter = require("./routes/admin");
const contestRouter = require("./routes/contests");

// implementing rate limiting and throttling
const Redis = require("ioredis");
const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
  enableOfflineQueue: false, // Optional: Fail fast if Redis is down
});

redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (err) => console.error("❌ Redis error", err));

const { RateLimiterRedis } = require("rate-limiter-flexible");

// per user rate limiting
const userLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "user",
  points: 10, // 10 requests
  duration: 60, // per minute
  execEvenlyly: true, // Execute evenly over the duration
  execEvenlyMinDelayMs: 100, // Minimum delay between executions
  blockDuration: 20, // Block for 20 seconds if limit is reached
});

const globalLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "global",
  points: 1000, // 1000 requests
  duration: 60, // per minute
  execEvenlyly: true, // Execute evenly over the duration
  execEvenlyMinDelayMs: 50, // Minimum delay between executions
  blockDuration: 20, // Block for 20 seconds if limit is reached
});

// Routes excluded from rate limiting
const excludedRoutes = [
  // Authentication routes
  "/auth/login",
  "/auth/signup",
  "/auth/refresh-token",
  "/auth/logout",
  "/auth",
  "/checkExistingUser",

  // Static data/read-only routes
  "/contests",
  "/contest/*/startTime",
  "/contest/*/participants/*",
  "/contest/*/participants",
  "/allProblems/*",
  "/problem/*/user/*",
  "/getTestcases/*",
  "/problem/*/acceptance",
  "/user/*/problemCount",
  "/user/*",
  "/contest/*/users",

  // Submission polling routes (need frequent access)
  "/pollSubmission/*",
  "*/submission/*",
  "submitContestCode",

  // Contest management routes (administrative)
  "/contest/*/register/*",
  "/contest/*/unregister/*",
  "/contest/*/user/*/rank/*",
  "/contest/*/problems/user/*",
  "/contest/*/problem/*/user/*",
];

// Helper function to check if route should be excluded from rate limiting
const isRouteExcluded = (path, method = "GET") => {
  return excludedRoutes.some((excludedRoute) => {
    // Convert route pattern to regex (replace * with .*)
    const pattern = excludedRoute.replace(/\*/g, "[^/]*");
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(path);
  });
};

// rate limiting middleware
const rateLimiterMiddleware = async (req, res, next) => {
  try {
    // Check user rate limit
    const userId = req.user ? req.user.id : req.ip; // Use user ID if authenticated, else use IP address
    const userRateLimit = await userLimiter.consume(userId);
    console.log("User Rate Limit:", userRateLimit);
    next();
  } catch (err) {
    res.set("Retry-After", Math.ceil(err.msBeforeNext / 1000));
    res.status(429).json({
      message: "Too many requests. Please slow down.",
      retryAfter: err.msBeforeNext,
    });
  }
};

// Conditional rate limiting wrapper
const conditionalRateLimiter = (req, res, next) => {
  const requestPath = req.path;
  const requestMethod = req.method;

  // Check if route should be excluded
  if (isRouteExcluded(requestPath, requestMethod)) {
    console.log(
      `Route excluded from rate limiting: ${requestMethod} ${requestPath}`
    );
    return next();
  }

  // Apply rate limiting for non-excluded routes
  console.log(`Applying rate limiting to: ${requestMethod} ${requestPath}`);
  return rateLimiterMiddleware(req, res, next);
};

// const storage = new Storage({
//   keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
// });

// const BUCKET_NAME = "codegotlatent";

// const prisma = new PrismaClient().$extends(withAccelerate());

// const submissionRoutes = require("./routes/index");

const app = express();
const server = require("http").createServer(app);
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: "50mb" })); // Increase the limit to handle larger requests
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: [process.env.CLIENT_URL, `${process.env.CLIENT_URL}/auth`],
    credentials: true,
  })
);
app.use(cookieParser());

// Apply conditional rate limiting to all routes
// app.use(conditionalRateLimiter);
// app.route("/auth", authRoutes);

const io = new Server(server, {
  path: "/socket.io",
  cors: {
    origin: "*",
  },
});

// When a user connects, log the connection
io.on("connection", (socket) => {
  console.log("A user connected", socket.id);
});

async function scheduleUpcomingContests() {
  const contests = await prisma.Contest.findMany({
    where: {
      status: "Upcoming",
    },
    select: {
      rankGuessStartTime: true,
      id: true,
    },
  });
  console.log("Contests:", contests);
  contests.forEach((contest) => {
    const rankGuessStartTime = new Date(contest.rankGuessStartTime);
    console.log("Rank Guess Start Time:", rankGuessStartTime);

    const date = rankGuessStartTime.getDate();
    const month = rankGuessStartTime.getMonth(); // 0-11
    const year = rankGuessStartTime.getFullYear();
    const hour = rankGuessStartTime.getHours();
    const minute = rankGuessStartTime.getMinutes();
    const second = rankGuessStartTime.getSeconds();
    // console.log("start time:", startTime);
    // const date = new Date(start);
    const RankGuessDate = new Date(year, month, date, hour, minute, second);
    // console.log("Start Time:", startTime);
    schedule.scheduleJob(RankGuessDate, async () => {
      console.log("Contest Rank Guess phase started:", contest.name);
      // Update the contest status to "Ongoing"
      const updatedContest = await prisma.Contest.update({
        where: {
          id: contest.id,
        },
        data: {
          status: "Rank Guess Phase",
        },
      });
      console.log("Contest updated:", updatedContest);
      io.emit("contestRankGuessPhaseStarted", {
        contestId: contest.id,
        updatedContest,
      });
    });
  });
}

async function scheduleRankGuessContests() {
  const contests = await prisma.Contest.findMany({
    where: {
      status: "Rank Guess Phase",
    },
    select: {
      startTime: true,
      id: true,
    },
  });
  console.log("Contests:", contests);
  contests.forEach((contest) => {
    const startTime = new Date(contest.startTime);
    console.log("Start Time:", startTime);

    const date = startTime.getDate();
    const month = startTime.getMonth(); // 0-11
    const year = startTime.getFullYear();
    const hour = startTime.getHours();
    const minute = startTime.getMinutes();
    const second = startTime.getSeconds();
    // console.log("start time:", startTime);
    // const date = new Date(start);
    const StartDate = new Date(year, month, date, hour, minute, second);
    // console.log("Start Time:", startTime);
    schedule.scheduleJob(StartDate, async () => {
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
  });
}

async function scheduleOngoingContests() {
  const contests = await prisma.Contest.findMany({
    where: {
      status: "Ongoing",
    },
    select: {
      endTime: true,
      id: true,
    },
  });
  console.log("Contests:", contests);
  contests.forEach((contest) => {
    const endTime = new Date(contest.endTime);
    console.log("End Time:", endTime);
    const date = endTime.getDate();
    const month = endTime.getMonth(); // 0-11
    const year = endTime.getFullYear();
    const hour = endTime.getHours();
    const minute = endTime.getMinutes();
    const second = endTime.getSeconds();
    // console.log("end time:", endTime);
    // const date = new Date(end);
    const EndDate = new Date(year, month, date, hour, minute, second);
    // console.log("End Time:", endTime);
    schedule.scheduleJob(EndDate, async () => {
      console.log("Contest rating update phase started:", contest.name);
      // Update the contest status to "Ended"
      const updatedContest = await prisma.Contest.update({
        where: {
          id: contest.id,
        },
        data: {
          status: "Rating Update Pending",
        },
      });
      console.log("Contest updated:", updatedContest);
      // call the ranking update function
      submitContest(contest.id);
      io.emit("contestRatingPending", {
        contestId: contest.id,
        updatedContest,
      });
    });
  });
}

async function scheduleRatingPendingContests() {
  const contests = await prisma.Contest.findMany({
    where: {
      status: "Rating Update Pending",
    },
    select: {
      endTime: true,
      id: true,
    },
  });
  console.log("Contests:", contests);
  contests.forEach((contest) => {
    const endTime = new Date(contest.endTime);
    console.log("End Time:", endTime);
    const date = endTime.getDate();
    const month = endTime.getMonth(); // 0-11
    const year = endTime.getFullYear();
    const hour = endTime.getHours();
    const minute = endTime.getMinutes();
    const second = endTime.getSeconds();
    // console.log("end time:", endTime);
    // const date = new Date(end);
    const EndDate = new Date(year, month, date, hour, minute, second);
    // console.log("End Time:", endTime);
    schedule.scheduleJob(
      new Date(EndDate.getTime() + 2 * 60 * 1000),
      async () => {
        console.log("Contest Rating Update Phase Started:", contest.name);
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
      }
    );
  });
}

// create a similiar cron job for every 1 min
cron.schedule("*/1 * * * *", async () => {
  console.log("Scheduling contests");
  // status -> upcoming, rank guess, ongoing, rating pending, ended
  await scheduleUpcomingContests();
  await scheduleRankGuessContests();
  await scheduleOngoingContests();
  await scheduleRatingPendingContests();
  console.log("Contests scheduled");
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

// Check if user already exists
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
  console.log("Refresh Token:", refreshToken);
  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token not found." });
  }

  try {
    await prisma.UserRefreshToken.update({
      where: { refreshToken },
      data: { refreshToken: "" },
    });
    res
      .clearCookie("refreshToken")
      .json({ message: "Logged out successfully." });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

app.use("/", userRouter);
app.use("/", contestRouter);
app.use("/", problemRouter);
app.use("/", submissionRouter);
app.use("/", adminRouter);
