const express = require("express");
const router = express.Router();
const { getUserProblemSubmissions, getUserDetailsFromUsername, getUserDetails, updateUserDetails, getProblemCount } = require("../controllers/userController");

router.get("/user/:userId/problem/:problemId/submission", getUserProblemSubmissions);
router.get("/user/:userName", getUserDetailsFromUsername);
router.get("/user/:userId/details", getUserDetails);
router.post("/user/:userId/update", updateUserDetails);
router.get("/user/:userId/problemCount", getProblemCount);

module.exports = router;