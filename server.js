const express = require("express");
const app = express();
const axios = require("axios");

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
    console.log(`Fetching data from ${full_url}`);
    const { data } = await axios.get(full_url);

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch events" });
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
