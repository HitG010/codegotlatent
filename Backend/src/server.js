const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const v4 = require("uuid").v4;
const bcrypt = require("bcrypt");
const { Server } = require("socket.io");
const prisma = require("./services/prisma");
const redis = require("./services/redis");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const {scheduler} = require("./sockets");

const problemRouter = require("./routes/problems");
const submissionRouter = require("./routes/submissions");
const userRouter = require("./routes/user");
const adminRouter = require("./routes/admin");
const contestRouter = require("./routes/contests");

redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (err) => console.error("❌ Redis error", err));

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

server.listen(PORT, () => {
  console.log(`Socket server is running on port ${PORT}`);
});