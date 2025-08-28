const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const { Server } = require("socket.io");
const redis = require("./services/redis");
const cookieParser = require("cookie-parser");
const prisma = require("./services/prisma");
const { isAdmin } = require("./middlewares/admin");
const { scheduler } = require("./sockets");
const {
  scheduleUpcomingContest,
  scheduleOngoingContest,
  scheduleRankGuessContest,
  scheduleRatingPendingContest,
} = require("./sockets");

const problemRouter = require("./routes/problems");
const submissionRouter = require("./routes/submissions");
const userRouter = require("./routes/user");
const adminRouter = require("./routes/admin");
const contestRouter = require("./routes/contests");
const authRouter = require("./routes/auth");

redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (err) => console.error("❌ Redis error", err));

const app = express();
const server = require("http").createServer(app);
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: "50mb" })); // Increase the limit to handle larger requests
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    // origin: "*",
    origin: [
      process.env.CLIENT_URL,
      `${process.env.CLIENT_URL}/auth`,
      "https://www.codegotlatent.com",
    ],
    credentials: true,
    // allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(cookieParser());

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
// scheduler(io);

app.use("/", userRouter);
app.use("/", contestRouter);
app.use("/", problemRouter);
app.use("/", submissionRouter);
app.use("/", adminRouter);
app.use("/", authRouter);

app.post("/contests/new", isAdmin, async (req, res) => {
  const { name, description, startTime, endTime, rankGuessStartTime, status } =
    req.body;
  try {
    const contest = await prisma.Contest.create({
      data: {
        name,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        rankGuessStartTime: new Date(rankGuessStartTime),
        status,
      },
    });
    console.log("Contest created:", contest);
    // Schedule the contest based on its status
    await scheduleContest(id);
    return res.status(201).json(contest);
  } catch (error) {
    console.error("Error creating contest:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/contests/edit/:id", isAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    rules,
    startTime,
    endTime,
    rankGuessStartTime,
    status,
  } = req.body;
  try {
    const contest = await prisma.Contest.update({
      where: { id },
      data: {
        name,
        description,
        rules,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        rankGuessStartTime: new Date(rankGuessStartTime),
        status,
        isScheduled: false, // Reset scheduling status on update
      },
    });
    console.log("Contest updated:", contest);
    // Schedule the contest based on its status
    await scheduleContest(id);
    return res.status(200).json(contest);
  } catch (error) {
    console.error("Error updating contest:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

async function scheduleContest(contestId) {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId, isScheduled: false },
    select: {
      status: true,
    },
  });
  if (!contest) {
    throw new Error("Contest not found");
  }
  switch (contest.status) {
    case "Upcoming":
      await scheduleUpcomingContest(io, contestId);
      break;
    case "Ongoing":
      await scheduleOngoingContest(io, contestId);
      break;
    case "Rank Guess Phase":
      await scheduleRankGuessContest(io, contestId);
      break;
    case "Rating Update Pending":
      await scheduleRatingPendingContest(io, contestId);
      break;
    case "Ended":
      break;
    default:
      throw new Error("Unknown contest status");
  }
}

// module.exports = { io };

server.listen(PORT, () => {
  console.log(`Socket server is running on port ${PORT}`);
});
