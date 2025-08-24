// to check if user is admin or not
const prisma = require("../services/prisma");

const WHITELIST = ["guptahitesh201105@gmail.com", "bindrakartik64@gmail.com"];

const isAdmin = async (req, res, next) => {
  const userId = req.body.userId; // Assuming user ID is stored in req.body
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (user && WHITELIST.includes(user.email)) {
    next();
  } else {
    res.status(403).json({ error: "Forbidden" });
  }
};

module.exports = {
  isAdmin,
};
