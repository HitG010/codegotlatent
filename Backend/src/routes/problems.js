// /allProblems, /problem/:pId/user/:uId
const express = require("express");
const router = express.Router();
const { allProblems, getProblem, acceptanceRate, getAllTags, deleteAllTestcases } = require("../controllers/problemController");

router.get("/allProblems/:userId", allProblems);
router.get("/problem/:problemId/user/:userId", getProblem);
router.get("/problem/:problemId/acceptance", acceptanceRate);
router.get("/tags", getAllTags);
router.post("/problem/:problemId/deleteAllTestCases", deleteAllTestcases);

module.exports = router;
