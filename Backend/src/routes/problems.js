// /allProblems, /problem/:pId/user/:uId
const express = require("express");
const router = express.Router();
const { allProblems, getProblem } = require("../controllers/problemController");

router.get("/allProblems", allProblems);
router.get("/problem/:pId/user/:uId", getProblem);

module.exports = router;
