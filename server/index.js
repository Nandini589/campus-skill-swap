require("dotenv").config();
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const swapsRouter = require("./routes/swaps");

const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/skillswap";

const app = express();
app.use(express.json());

app.use("/api/swaps", swapsRouter);

const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(publicDir, "index.html"));
});

async function main() {
  await mongoose.connect(MONGODB_URI);
  app.listen(PORT, () => {
    console.log(`Server http://localhost:${PORT}`);
    console.log(`MongoDB: ${MONGODB_URI}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});