const express = require("express");
const router = express.Router();
const { addTestcase, addProblem } = require("../controllers/adminController");

router.post("/addTestCase", async (req, res) => {
  await addTestcase(req, res);
});

router.post("/addProblem", async (req, res) => {
  await addProblem(req, res);
});

module.exports = router;