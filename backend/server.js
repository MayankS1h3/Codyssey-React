require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const redis = require('redis');

const app = express();

app.use(cors());

app.use(express.json());

// Connect Database
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error("FATAL ERROR: MONGO_URI is not defined in .env file.");
  process.exit(1);
}

mongoose
  .connect(mongoURI, {})
  .then(() => console.log("MongoDB Connected..."))
  .catch((err) => {
    console.error("MongoDB Connection Error:", err.message);
    process.exit(1);
  });

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.connect().then(() => {
  console.log('Redis connected');
}).catch((err) => {
  console.error('Redis connection error:', err);
});

// Export for use in routes
module.exports.redisClient = redisClient;

app.get("/api", (req, res) => res.send("Codyssey API Running"));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/user", require("./routes/user"));

app.get("/api/cf-proxy/user-status", async (req, res) => {
  const handle = req.query.handle;
  if (!handle) {
    return res.status(400).json({ message: "Codeforces handle is required" });
  }

  const count = req.query.count || 5000;
  const from = req.query.from || 1;

  try {
    const cfUrl = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(
      handle
    )}&from=${from}&count=${count}`;

    const cfResponse = await fetch(cfUrl);

    if (!cfResponse.ok) {
      let cfErrorData;
      try {
        cfErrorData = await cfResponse.json();
      } catch (e) {
        console.error(
          "Codeforces API non-JSON error response:",
          cfResponse.statusText
        );
        return res
          .status(cfResponse.status)
          .json({ message: `Codeforces API Error: ${cfResponse.statusText}` });
      }
      console.error("Codeforces API error response from proxy:", cfErrorData);
      return res.status(cfResponse.status).json({
        message: `Codeforces API Error: ${
          cfErrorData.comment || cfResponse.statusText
        }`,
        cfComment: cfErrorData.comment,
      });
    }

    const data = await cfResponse.json();
    res.json(data);
  } catch (error) {
    console.error("Error in Codeforces proxy route:", error.message);
    res
      .status(500)
      .json({ message: "Server error while fetching from Codeforces." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
