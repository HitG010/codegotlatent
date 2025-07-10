// /contests
const express = require("express");
const router = express.Router();
const {
  getAllContests,
  getContestById,
  isContestRegistered,
  registerContest,
  unregisterContest,
  getContestProblems,
  getContestProblem,
  getRankings,
  getStartTime,
  submitPredictedRank,
  getParticipantsCount,
  getUserRankGuess,

} = require("../controllers/contestController");

router.get("/contests", getAllContests);
router.get("/contest/:id", getContestById);
router.get("/contest/:contestId/participants/:userId", isContestRegistered);
router.post("/contest/:contestId/register/:userId", registerContest);
router.post("/contest/:contestId/unregister/:userId", unregisterContest);
router.get("/contest/:contestId/problems/user/:userId", getContestProblems);
router.get(
  "/contest/:contestId/problem/:problemId/user/:userId",
  getContestProblem
);
router.get("/contest/:contestId/users", getRankings);
router.get("/contest/:contestId/startTime", getStartTime);
router.post(
  "/contest/:contestId/user/:userId/rank/:predictedrank",
  submitPredictedRank
);
router.get("/contest/:contestId/participants", getParticipantsCount);
router.get('/contest/:contestId/user/:userId/rankGuess', getUserRankGuess);

module.exports = router;
