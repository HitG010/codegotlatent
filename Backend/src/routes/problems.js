// /allProblems, /problem/:pId/user/:uId
const express = require("express");
const router = express.Router();
const { isSameUser } = require("../middlewares/user");
const { isAdmin } = require("../middlewares/admin");
const {
  allProblems,
  getProblem,
  acceptanceRate,
  getAllTags,
  deleteAllTestcases,
} = require("../controllers/problemController");

router.get("/allProblems/:userId", allProblems);
router.get("/problem/:problemId/user/:userId", isSameUser, getProblem);
router.get("/problem/:problemId/acceptance", acceptanceRate);
router.get("/tags", getAllTags);
router.post(
  "/problem/:problemId/deleteAllTestCases",
  isAdmin,
  deleteAllTestcases
);

module.exports = router;
