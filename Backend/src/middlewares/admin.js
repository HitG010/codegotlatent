// Verifies the access token and checks the admin whitelist.
// Email comes from the signed JWT claims — no DB round trip needed here.
const jwt = require("jsonwebtoken");

const WHITELIST = ["guptahitesh201105@gmail.com", "bindrakartik64@gmail.com"];

const isAdmin = async (req, res, next) => {
  try {
    const token = req.headers["authorization"]?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const isWhitelisted = WHITELIST.some(
      (adminEmail) => adminEmail.toLowerCase() === decoded.email?.toLowerCase()
    );

    if (!isWhitelisted) {
      return res.status(403).json({ error: "Forbidden: Not an admin" });
    }

    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (err) {
    console.error("Admin auth error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  isAdmin,
};
