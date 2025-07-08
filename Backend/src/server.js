const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const { Server } = require("socket.io");
const redis = require("./services/redis");
const cookieParser = require("cookie-parser");
const { scheduler } = require("./sockets");

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
    origin: [
      process.env.CLIENT_URL,
      `${process.env.CLIENT_URL}/auth`,
      ".codegotlatent.com",
    ],
    credentials: true,
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
scheduler(io);

app.use("/", userRouter);
app.use("/", contestRouter);
app.use("/", problemRouter);
app.use("/", submissionRouter);
app.use("/", adminRouter);
app.use("/", authRouter);

server.listen(PORT, () => {
  console.log(`Socket server is running on port ${PORT}`);
});
