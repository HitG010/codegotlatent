const express = require("express");
const submissionRoutes = require("./submissionRoutes");

const router = express.Router();

router.use("/submissions", submissionRoutes);

module.exports = router;