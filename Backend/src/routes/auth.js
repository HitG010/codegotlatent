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
  // console.log("Received ID Token:", idToken);

  try {
    // Set CORS headers for iOS compatibility
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header(
      "Access-Control-Allow-Methods",
      "GET,PUT,POST,DELETE,UPDATE,OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization"
    );

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
    // console.log("Setting cookie with refresh token:", refreshToken);

    // Detect if request is from iOS
    const userAgent = req.headers["user-agent"] || "";
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);

    // clear any pre-existing cookies
    res.clearCookie("refreshToken");

    if (isIOS) {
      // For iOS devices, send refresh token in response body instead of cookie
      // console.log("iOS device detected, sending refresh token in response body");
      res.json({
        accessToken,
        refreshToken, // Send refresh token in response for iOS
        user: { id: user.id, email: user.email },
        isIOS: true,
      });
    } else {
      // For other devices, use cookie as normal
      res
        .cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
          domain: process.env.DOMAIN,
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        .json({
          accessToken,
          user: { id: user.id, email: user.email },
          isIOS: false,
        });
    }
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(401).json({ message: "Invalid Google ID token" });
  }
});

router.post("/auth/refresh-token", async (req, res) => {
  // Try to get refresh token from cookie first, then from request body (for iOS)
  let refreshToken = req.cookies.refreshToken;

  // If no cookie refresh token, check request body (for iOS devices)
  if (!refreshToken && req.body.refreshToken) {
    refreshToken = req.body.refreshToken;
    // console.log("Using refresh token from request body (iOS):", refreshToken);
  }

  // console.log("Refresh Token:", refreshToken);
  // console.log("log from refresh-token route");

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
        }

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
  // Check if the request is from iOS
  const userAgent = req.headers["user-agent"] || "";
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);

  const refreshToken = isIOS ? req.body.refreshToken : req.cookies.refreshToken;
  // console.log("Refresh Token:", refreshToken);
  // console.log("Is iOS device:", isIOS);

  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token not found." });
  }

  try {
    // Delete the refresh token from database (note: userRefreshToken not UserRefreshToken)
    await prisma.userRefreshToken.delete({
      where: { refreshToken },
    });

    // Clear cookie regardless of device type (for safety)
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      domain: process.env.DOMAIN,
      path: "/",
    });

    res.json({ message: "Logged out successfully." });
  } catch (error) {
    console.error("Error during logout:", error);

    // If refresh token doesn't exist in DB, still consider it a successful logout
    if (error.code === "P2025") {
      // Prisma record not found error
      res.clearCookie("refreshToken");
      return res.json({ message: "Logged out successfully." });
    }

    res.status(500).json({ message: "Internal server error." });
  }
});

module.exports = router;
