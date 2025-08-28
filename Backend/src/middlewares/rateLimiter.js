const { RateLimiterRedis } = require("rate-limiter-flexible");
const redis = require("../services/redis");

// per user rate limiting
const userLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "user",
  points: 2, // 2 requests
  duration: 10, // per 10 seconds
  execEvenlyly: true, // Execute evenly over the duration
  execEvenlyMinDelayMs: 100, // Minimum delay between executions
  blockDuration: 20, // Block for 20 seconds if limit is reached
});

const globalLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "global",
  points: 2000, // 1000 requests
  duration: 60, // per minute
  // execEvenlyly: true, // Execute evenly over the duration
  // execEvenlyMinDelayMs: 50, // Minimum delay between executions
  blockDuration: 20, // Block for 20 seconds if limit is reached
});

const rateLimiterMiddleware = async (req, res, next) => {
  try {
    // Check user rate limit
    const userId = req.body.userId || req.ip; // Use user ID if authenticated, else use IP address
    const userRateLimit = await userLimiter.consume(userId);
    // console.log("User Rate Limit:", userRateLimit);
    // Check global rate limit
    const globalRateLimit = await globalLimiter.consume("global");
    // console.log("Global Rate Limit:", globalRateLimit);
    next();
  } catch (err) {
    res.set("Retry-After", Math.ceil(err.msBeforeNext / 1000));
    res.status(429).json({
      message: "Too many requests. Please slow down.",
      retryAfter: err.msBeforeNext,
    });
  }
};

module.exports = rateLimiterMiddleware;
