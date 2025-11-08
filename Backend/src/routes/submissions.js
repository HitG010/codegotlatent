const express = require("express");
const router = express.Router();
const { isSameUser } = require("../middlewares/user");
const {
  submitCode,
  batchSubmission,
  getSubmission,
  pollSubmission,
  getUserSubmission,
} = require("../controllers/submissionController");
const rateLimiterMiddleware = require("../middlewares/rateLimiter");

router.post(
  "/submitContestCode",
  rateLimiterMiddleware,
  isSameUser,
  submitCode
);
router.post("/batchSubmission", rateLimiterMiddleware, batchSubmission);
router.get("/submission/:id", getSubmission);
router.post("/pollSubmission/:id", pollSubmission);
router.get(
  "/submission/:submissionId/user/:userId",
  isSameUser,
  getUserSubmission
);

module.exports = router;
