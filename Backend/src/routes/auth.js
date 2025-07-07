// dtenv config
const dotenv = require("dotenv");
dotenv.config();
const bcrypt = require("bcrypt");
const { v4 } = require("uuid");
const prisma = require("../services/prisma");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../services/auth");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const router = require("express").Router();
const jwt = require("jsonwebtoken");

router.post("/auth/google", async (req, res) => {
  const { idToken } = req.body;
  console.log("Received ID Token:", idToken);

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    // Check if user exists
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Create user if not exists
      // Generate a more random username to prevent collisions
      let username;
      let isUnique = false;
      while (!isUnique) {
        username = "User_" + v4().replace(/-/g, "").slice(0, 12);
        const existing = await prisma.user.findUnique({ where: { username } });
        if (!existing) isUnique = true;
      }
      user = await prisma.user.create({
        data: {
          email,
          name,
          username,
          password: bcrypt.hashSync(v4(), 10), // random password just to satisfy schema
        },
      });
    }

    const accessToken = await generateAccessToken({
      id: user.id,
      email: user.email,
    });
    const refreshToken = await generateRefreshToken({
      id: user.id,
      email: user.email,
    });

    const existingToken = await prisma.userRefreshToken.findUnique({
      where: { userId: user.id },
    });

    if (existingToken) {
      await prisma.userRefreshToken.update({
        where: { userId: user.id },
        data: { refreshToken },
      });
    } else {
      await prisma.userRefreshToken.create({
        data: {
          userId: user.id,
          refreshToken,
        },
      });
    }
    console.log("Setting cookie with refresh token:", refreshToken);
    res
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
        // domain: 'codegotlatent.onrender.com',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({ accessToken, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(401).json({ message: "Invalid Google ID token" });
  }
});

router.post("/auth/refresh-token", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  console.log("Refresh Token:", refreshToken);
  console.log("log from refresh-token route");
  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token not found." });
  }
  try {
    const userRefreshToken = await prisma.userRefreshToken.findUnique({
      where: { refreshToken },
    });
    if (!userRefreshToken) {
      return res.status(403).json({ message: "Invalid refresh token." });
    }

    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      async (err, decoded) => {
        if (err) {
          return res.status(403).json({ message: "Invalid refresh token." });
        }

        // Fetch full user details
        const user = await prisma.user.findUnique({
          where: { id: userRefreshToken.userId },
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
            pfpId: true,
            // add other fields as needed
          },
        });

        if (!user) {
          return res.status(404).json({ message: "User not found." });
        } else console.log("User found:", user);

        const accessToken = await generateAccessToken({
          id: user.id,
          email: user.email,
        });

        res.json({
          accessToken: accessToken,
          user,
        });
      }
    );
  } catch (error) {
    console.error("Error checking refresh token:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

router.post("/auth/logout", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  console.log("Refresh Token:", refreshToken);
  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token not found." });
  }

  try {
    await prisma.UserRefreshToken.update({
      where: { refreshToken },
      data: { refreshToken: null },
    });
    res
      .clearCookie("refreshToken")
      .json({ message: "Logged out successfully." });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

module.exports = router;
