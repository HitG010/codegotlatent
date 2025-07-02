const express = require("express");
const router = express.Router();
const { getUserProblemSubmissions, getUserDetailsFromUsername, getUserDetails, updateUserDetails } = require("../controllers/userController");

router.get("/user/:userId/problem/:problemId/submission", getUserProblemSubmissions);
router.get("/user/:userName", getUserDetailsFromUsername);
router.get("/user/:userId/details", getUserDetails);
router.post("/user/:userId/update", updateUserDetails);

module.exports = router;