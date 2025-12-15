const express = require("express");
const app = express();
const axios = require("axios");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const logger = require("./server/utils/logger");

// Trust Vercel's proxy to correctly identify client IP
app.set("trust proxy", 1);

// CORS configuration for Vercel deployment
// Define allowed origins for production (using Set for O(1) lookup)
const allowedOrigins = new Set(
  ["https://mkw-lounge-stats.vercel.app", process.env.FRONTEND_URL].filter(
    Boolean
  )
);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      try {
        const { hostname } = new URL(origin);

        // In development, allow localhost and 127.0.0.1
        if (
          process.env.NODE_ENV !== "production" &&
          (hostname === "localhost" || hostname === "127.0.0.1")
        ) {
          return callback(null, true);
        }

        // Allow Vercel preview deployments (e.g., mkw-lounge-stats-git-branch.vercel.app)
        if (
          hostname.endsWith(".vercel.app") &&
          (hostname === "mkw-lounge-stats.vercel.app" ||
            hostname.endsWith(".mkw-lounge-stats.vercel.app"))
        ) {
          return callback(null, true);
        }

        // Check if origin is in allowed list
        if (allowedOrigins.has(origin)) {
          return callback(null, true);
        }

        // Silently reject (no error throwing)
        return callback(null, false);
      } catch {
        // Invalid URL format - silently reject
        return callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400, // Cache preflight requests for 24 hours
  })
);

// Set security headers
app.use(helmet());

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: "Too many requests, please try again later." },
});

// Apply rate limiting to all requests
app.use(limiter);

// Request logging (development only)
app.use((req, res, next) => {
  logger.request(req);
  next();
});

// Security constants
const MAX_CACHE_SIZE = 1000;
const MAX_PLAYER_NAME_LENGTH = 50;
const MAX_SEARCH_LENGTH = 100;

// Input validation and sanitization
const validatePlayerName = (name) => {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Player name is required" };
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "Player name cannot be empty" };
  }

  if (trimmed.length > MAX_PLAYER_NAME_LENGTH) {
    return {
      valid: false,
      error: `Player name cannot exceed ${MAX_PLAYER_NAME_LENGTH} characters`,
    };
  }

  // Remove control characters that could be used for injection
  const sanitized = trimmed.replace(/[\x00-\x1F\x7F]/g, "");

  return { valid: true, sanitized };
};

const enforceCacheLimit = () => {
  if (cacheStore.size > MAX_CACHE_SIZE) {
    // Remove oldest entries (simple FIFO)
    const keysToDelete = Array.from(cacheStore.keys()).slice(
      0,
      cacheStore.size - MAX_CACHE_SIZE
    );
    keysToDelete.forEach((key) => {
      cacheStore.delete(key);
      logger.cache("EVICT", key);
    });
  }
};

// Simple in-memory cache with TTL to reduce repeated upstream calls
const cacheStore = new Map();
const DEFAULT_TTL_MS = 60 * 1000; // 1 minute

const getCacheKey = (prefix, params = {}) => {
  if (!params || Object.keys(params).length === 0) {
    return prefix;
  }
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}:${params[key]}`)
    .join("|");
  return `${prefix}|${sorted}`;
};

const setCache = (key, value, ttl = DEFAULT_TTL_MS) => {
  enforceCacheLimit();
  cacheStore.set(key, { value, expiresAt: Date.now() + ttl });
  logger.cache("SET", key);
};

const getCache = (key) => {
  const entry = cacheStore.get(key);
  if (!entry) {
    logger.cache("MISS", key);
    return null;
  }
  if (entry.expiresAt < Date.now()) {
    cacheStore.delete(key);
    logger.cache("EXPIRED", key);
    return null;
  }
  logger.cache("HIT", key);
  return entry.value;
};

const invalidateCache = (predicate) => {
  for (const key of cacheStore.keys()) {
    if (predicate(key)) {
      cacheStore.delete(key);
    }
  }
};

app.use(express.json());

// Do not call listen() in serverless/edge environments; Vercel will handle the request lifecycle.

app.get("/api/player/details/:name", async (req, res) => {
  try {
    const validation = validatePlayerName(req.params.name);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const playerName = validation.sanitized;
    const base_url = "https://lounge.mkcentral.com/api/player/details?name=";
    const full_url = `${base_url}${encodeURIComponent(
      playerName
    )}&game=mkworld&season=1`;

    const cacheKey = getCacheKey("player-details", { name: playerName });
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const { data } = await axios.get(full_url);

    setCache(cacheKey, data, 2 * DEFAULT_TTL_MS);

    res.json(data);
  } catch (error) {
    invalidateCache((key) => key.startsWith("player-details"));
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404) {
        logger.warn(`Player not found: ${req.params.name}`);
        return res.status(404).json({
          error: `No lounge records found for "${req.params.name}"`,
        });
      }
      if (status) {
        logger.error(`Player details API error (${status}):`, error.message);
        return res.status(status).json({
          error:
            error.response?.data?.error || "Failed to retrieve player details",
        });
      }
    }
    logger.error("Failed to fetch player details:", error.message);
    res.status(500).json({ error: "Failed to fetch player details" });
  }
});

app.get("/api/player/leaderboard/:name", async (req, res) => {
  try {
    const validation = validatePlayerName(req.params.name);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const playerName = validation.sanitized;
    const cacheKey = getCacheKey("player-leaderboard", { name: playerName });
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const base_url =
      "https://lounge.mkcentral.com/api/player/leaderboard?game=mkworld&season=1&search=";
    const full_url = `${base_url}${encodeURIComponent(playerName)}`;
    const { data } = await axios.get(full_url);

    const player = data.data.find(
      (p) => p.name.toLowerCase() === playerName.toLowerCase()
    );

    if (player) {
      setCache(cacheKey, player, DEFAULT_TTL_MS);
      res.json(player);
    } else {
      logger.warn(`Player not found in leaderboard: ${playerName}`);
      res.status(404).json({ error: "Player not found" });
    }
  } catch (error) {
    logger.error("Failed to fetch leaderboard search:", error.message);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// Compare multiple players
app.get("/api/players/compare", async (req, res) => {
  try {
    const names = req.query.names?.split(",") || [];

    if (names.length === 0 || names.length > 4) {
      return res
        .status(400)
        .json({ error: "Please provide 1-4 player names separated by commas" });
    }

    // Validate all player names
    const validatedNames = [];
    for (const name of names) {
      const validation = validatePlayerName(name);
      if (!validation.valid) {
        return res
          .status(400)
          .json({ error: `Invalid player name: ${validation.error}` });
      }
      validatedNames.push(validation.sanitized);
    }

    const cacheKey = getCacheKey("players-compare", {
      names: validatedNames.sort().join(","),
    });
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const base_url = "https://lounge.mkcentral.com/api/player/details";

    const promises = validatedNames.map((name) =>
      axios
        .get(base_url, {
          params: {
            name: name,
            game: "mkworld",
            season: 1,
          },
        })
        .then((response) => response.data)
        .catch((err) => ({
          error: true,
          name: name,
          message:
            err.response?.status === 404 ? "Player not found" : err.message,
        }))
    );

    const results = await Promise.all(promises);

    setCache(cacheKey, results, DEFAULT_TTL_MS);
    res.json(results);
  } catch (error) {
    logger.error("Failed to compare players:", error.message);
    res.status(500).json({ error: "Failed to fetch comparison data" });
  }
});

// Get leaderboard with pagination and filters
app.get("/api/leaderboard", async (req, res) => {
  try {
    const {
      skip = 0,
      pageSize = 50,
      minMmr,
      maxMmr,
      search,
      sortBy = "Mmr",
    } = req.query;

    const base_url =
      "https://lounge.mkcentral.com/api/player/leaderboard?game=mkworld&season=1";

    const params = {
      skip: parseInt(skip),
      pageSize: Math.min(parseInt(pageSize), 100),
      sortBy,
    };

    if (minMmr) params.minMmr = parseInt(minMmr);
    if (maxMmr) params.maxMmr = parseInt(maxMmr);
    if (search) {
      // Sanitize search parameter
      const sanitized = search
        .trim()
        .slice(0, MAX_SEARCH_LENGTH)
        .replace(/[\x00-\x1F\x7F]/g, "");
      if (sanitized) {
        params.search = sanitized;
      }
    }

    const cacheKey = getCacheKey("leaderboard", params);
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const axiosResponse = await axios.get(base_url, { params });

    const data = axiosResponse.data;

    // The API returns totalPlayers, but we'll normalize it to totalCount for consistency
    const response = {
      data: data.data || [],
      totalCount: data.totalPlayers || 0,
      totalPlayers: data.totalPlayers || 0,
    };

    setCache(cacheKey, response);
    res.json(response);
  } catch (error) {
    invalidateCache((key) => key.startsWith("leaderboard"));
    logger.error("Failed to fetch main leaderboard:", error.message);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// Export app for Vercel serverless function
module.exports = app;

// Start local server if not in production (Vercel)
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });
}
