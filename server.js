const express = require("express");
const app = express();
const axios = require("axios");

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
  cacheStore.set(key, { value, expiresAt: Date.now() + ttl });
};

const getCache = (key) => {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cacheStore.delete(key);
    return null;
  }
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

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

app.get("/pokemon/:name", async (req, res) => {
  try {
    const pokemonName = req.params.name.toLowerCase();
    const response = await axios.get(
      `https://pokeapi.co/api/v2/pokemon/${pokemonName}`
    );

    const data = response.data;

    res.json({
      name: data.name,
      id: data.id,
      height: data.height,
      weight: data.weight,
      sprite: data.sprites.front_default,
    });
  } catch (error) {
    if (error.response && error.response.status == 404) {
      return res.status(404).json({ error: "Pokemon not found" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/player/details/:name", async (req, res) => {
  try {
    const playerName = req.params.name;
    const base_url = "https://lounge.mkcentral.com/api/player/details?name=";
    const full_url = `${base_url}${playerName}&game=mkworld&season=1`;

    const cacheKey = getCacheKey("player-details", { name: playerName });
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    console.log(`Fetching data from ${full_url}`);
    const { data } = await axios.get(full_url);

    setCache(cacheKey, data, 2 * DEFAULT_TTL_MS);

    res.json(data);
  } catch (error) {
    invalidateCache((key) => key.startsWith("player-details"));
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404) {
        return res.status(404).json({
          error: `No lounge records found for "${req.params.name}"`,
        });
      }
      if (status) {
        return res.status(status).json({
          error:
            error.response?.data?.error || "Failed to retrieve player details",
        });
      }
    }
    res.status(500).json({ error: "Failed to fetch player details" });
  }
});

app.get("/api/player/leaderboard/:name", async (req, res) => {
  try {
    console.log("test");
    const playerName = req.params.name;
    const base_url =
      "https://lounge.mkcentral.com/api/player/leaderboard?game=mkworld&season=1&search=";
    const full_url = `${base_url}${encodeURIComponent(playerName)}`;
    console.log(`Fetching data from ${full_url}`);
    const { data } = await axios.get(full_url);

    const player = data.data.find(
      (p) => p.name.toLowerCase() === playerName.toLowerCase()
    );

    if (player) {
      console.log(
        `The player ID of ${playerName} is ${player.id} and their MMR is ${player.mmr}`
      );
      res.json(player);
    } else {
      res.status(404).json({ error: "Player not found" });
    }
  } catch (error) {
    console.error(error);
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

    const base_url = "https://lounge.mkcentral.com/api/player/details";

    const promises = names.map((name) =>
      axios
        .get(base_url, {
          params: {
            name: name.trim(),
            game: "mkworld",
            season: 1,
          },
        })
        .then((response) => response.data)
        .catch((err) => ({
          error: true,
          name: name.trim(),
          message:
            err.response?.status === 404 ? "Player not found" : err.message,
        }))
    );

    const results = await Promise.all(promises);

    res.json(results);
  } catch (error) {
    console.error(error);
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
    if (search) params.search = search;

    const cacheKey = getCacheKey("leaderboard", params);
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    console.log(`Fetching leaderboard from URL:`, base_url);
    console.log(`With params:`, params);

    const axiosResponse = await axios.get(base_url, { params });

    console.log(`Response status:`, axiosResponse.status);
    console.log(`Response headers:`, axiosResponse.headers["content-type"]);
    console.log(`Response data type:`, typeof axiosResponse.data);
    console.log(`Response data keys:`, Object.keys(axiosResponse.data || {}));

    const data = axiosResponse.data;

    // The API returns totalPlayers, but we'll normalize it to totalCount for consistency
    const response = {
      data: data.data || [],
      totalCount: data.totalPlayers || 0,
      totalPlayers: data.totalPlayers || 0,
    };

    console.log(
      `Sending response with ${response.data.length} players, totalCount: ${response.totalCount}`
    );

    setCache(cacheKey, response);
    res.json(response);
  } catch (error) {
    console.error("Leaderboard error:", error.message);
    console.error("Error response status:", error.response?.status);
    console.error("Error response data:", error.response?.data);
    invalidateCache((key) => key.startsWith("leaderboard"));
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

app.get("/posts", async (req, res) => {
  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/posts");
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.get("/people/:id", async (req, res) => {
  try {
    const characterId = req.params.id;
    const { data } = await axios.get(
      `https://swapi.dev/api/people/${characterId}`
    );
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.get("/posts/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const { data } = await axios.get(
      `https://jsonplaceholder.typicode.com/posts/${postId}`
    );
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.get("/weather/:city", async (req, res) => {
  try {
    const cityName = req.params.city;

    const geoResponse = await axios.get(
      "https://geocoding-api.open-meteo.com/v1/search",
      {
        params: {
          name: cityName,
          count: 1,
        },
      }
    );

    if (
      !geoResponse.data ||
      !geoResponse.data.results ||
      geoResponse.data.results.length === 0
    ) {
      return res.status(404).json({ error: "City not found" });
    }

    const { latitude, longitude, name } = geoResponse.data.results[0];

    const weatherResponse = await axios.get(
      "https://api.open-meteo.com/v1/forecast",
      {
        params: {
          latitude,
          longitude,
          current_weather: true,
        },
      }
    );
    const cw = weatherResponse.data.current_weather;

    res.json({
      city: name,
      latitude,
      longitude,
      temperature: cw.temperature,
      wind_speed: cw.windspeed,
      description: `Weather code: ${cw.weathercode}`,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch weather" });
  }
});
