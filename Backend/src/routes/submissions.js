const express = require("express");
const router = express.Router();
const {
  submitCode,
  batchSubmission,
  getSubmission,
  pollSubmission,
  getUserSubmission,
} = require("../controllers/submissionController");
const rateLimiterMiddleware = require("../middlewares/rateLimiter");

router.post("/submitContestCode", rateLimiterMiddleware, submitCode);
router.post("/batchSubmission", rateLimiterMiddleware, batchSubmission);
router.get("/submission/:id", getSubmission);
router.post("/pollSubmission/:id", pollSubmission);
router.get("/submission/:submissionId/user/:userId", getUserSubmission);

module.exports = router;
