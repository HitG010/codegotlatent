const express = require("express");
const SubmissionController = require("../controllers/submissionController");

const router = express.Router();
const submissionController = new SubmissionController();

router.post("/", submissionController.createSubmission);
router.get("/:id", submissionController.getSubmission);

module.exports = router;