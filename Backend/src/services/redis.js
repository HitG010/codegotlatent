const Redis = require("ioredis");
const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
  enableOfflineQueue: false, // Optional: Fail fast if Redis is down
});

module.exports = redis;