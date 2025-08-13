const express = require("express");
const router = express.Router();
const { addTestcase, addProblem, editProblem } = require("../controllers/adminController");

router.post("/addTestCase", async (req, res) => {
  await addTestcase(req, res);
});

router.post("/addProblem", async (req, res) => {
  await addProblem(req, res);
});

router.put("/editProblem/:id", async (req, res) => {
  await editProblem(req, res);
});

module.exports = router;
