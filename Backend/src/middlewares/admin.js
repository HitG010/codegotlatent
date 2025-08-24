// to check if user is admin or not
const prisma = require("../services/prisma");
const jwt = require("jsonwebtoken");

const WHITELIST = ["guptahitesh201105@gmail.com", "bindrakartik64@gmail.com"];

const isAdmin = async (req, res, next) => {
  try {
    // 1. Get token from cookies or headers (prefer access token, not refresh)
    console.log(req.headers)
    const token = req.headers['authorization']?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    // 2. Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
      console.error("Invalid token:", err.message);
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 3. Fetch user from DB using id from token (NOT req.body)
    console.log("Decoded Token:", decoded);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 4. Check whitelist (case-insensitive email check)
    const isWhitelisted = WHITELIST.some(
      adminEmail => adminEmail.toLowerCase() === user.email.toLowerCase()
    );

    if (!isWhitelisted) {
      return res.status(403).json({ error: "Forbidden: Not an admin" });
    }

    // 5. Attach user to req for downstream use
    req.user = user;
    next();

  } catch (err) {
    console.error("Admin auth error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  isAdmin,
};
