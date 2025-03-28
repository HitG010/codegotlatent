const express = require("express");
const cors = require("cors");

// const submissionRoutes = require("./routes/index");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
// app.use("/api", submissionRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get("/hello", (req, res) => {
  res.json({ message: "Hello World" });
});

app.post("/callback", (req, res) => {
  console.log("Callback received:", req.body);
  res.status(200).send("OK");
});
