// Verifies the access token and that it belongs to the user in the request.
// Identity comes from the signed JWT claims — no DB round trip needed here.
const jwt = require("jsonwebtoken");

const isSameUser = async (req, res, next) => {
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

    const userIdParam = req.params.userId || req.body.userId;
    if (!userIdParam || decoded.id !== userIdParam) {
      return res.status(403).json({ error: "Forbidden: Not the same user" });
    }

    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (err) {
    console.error("Auth error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  isSameUser,
};
