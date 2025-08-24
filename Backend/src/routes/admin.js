const express = require("express");
const router = express.Router();
const {
  addTestcase,
  addProblem,
  editProblem,
} = require("../controllers/adminController");
const { isAdmin } = require("../middlewares/admin");

router.post("/addTestCase", isAdmin, async (req, res) => {
  await addTestcase(req, res);
});

router.post("/addProblem", isAdmin, async (req, res) => {
  await addProblem(req, res);
});

router.put("/editProblem/:id", isAdmin, async (req, res) => {
  await editProblem(req, res);
});

module.exports = router;
