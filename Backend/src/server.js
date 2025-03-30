const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const { PrismaClient } = require("@prisma/client/edge");
const { withAccelerate } = require("@prisma/extension-accelerate");

const prisma = new PrismaClient().$extends(withAccelerate());

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

app.put("/callback", (req, res) => {
  console.log("Callback received:", req.body);
  res.status(200).send("OK");
});

app.post("/submission", async (req, res) => {
  console.log("Submission received:", req.body);
  // send submission to judge0 server
  const body = await req.body;
  // console.log(await req.body);
  console.log("Body:", body);
  // const body = JSON.stringify({
  //   source_code: req.body.source_code,
  //   language_id: req.body.language_id,
  //   stdin: req.body.stdin,
  //   callback_url: req.body.callback_url,
  // });
  console.log("Body:", body);
  const url = `${process.env.JUDGE0_API}/submissions`;
  console.log("URL:", url);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  console.log("Response:", data);

  // res.status(200).send("OK");
  res.send(data);
});

app.get("/submission/:id", async (req, res) => {
  console.log(req.params);
  const url = `${process.env.JUDGE0_API}/submissions/${req.params.id}`;
  console.log("URL:", url);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
  const data = await response.json();
  console.log("Response:", data);

  // res.status(200).send("OK");
  res.send(data);
});

app.post("/populateDatabase", async (req, res) => {
  async function main() {
    const user = await prisma.User.create({
      data: {
        username: "Alice",
        email: "abc@gmail.com",
        password: "123456",
      },
    });
    console.log(user);
  }

  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
  res.send("Database populated");
});
