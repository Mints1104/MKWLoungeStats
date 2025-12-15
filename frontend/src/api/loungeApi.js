/**
 * Centralized API service for Mario Kart Lounge endpoints
 * Handles all HTTP requests with consistent error handling and response parsing
 */

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

/**
 * Base fetch wrapper with error handling and retry logic
 */
async function fetchApi(url, options = {}, retries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") {
        throw error; // Let abort errors propagate for cleanup
      }

      lastError = error;

      // Don't retry on 4xx errors (client errors)
      if (error.message.includes("HTTP 4")) {
        throw error;
      }

      // If not the last attempt, wait before retrying
      if (attempt < retries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 500 * (attempt + 1))
        );
      }
    }
  }

  throw new Error(lastError?.message || "Network request failed");
}

/**
 * Lounge API methods
 */
export const loungeApi = {
  /**
   * Fetch detailed player information including MMR history
   * @param {string} name - Player name
   * @param {number} season - Season number (default: 1)
   * @param {AbortSignal} signal - Optional abort signal for cancellation
   */
  async getPlayerDetails(name, season = 1, signal) {
    if (!name?.trim()) {
      throw new Error("Player name is required");
    }

    const encodedName = encodeURIComponent(name.trim());
    const url = `${API_BASE}/player/details/${encodedName}?season=${season}`;

    return fetchApi(url, { signal });
  },

  /**
   * Compare multiple players head-to-head
   * @param {string[]} names - Array of player names (2-4 players)
   * @param {AbortSignal} signal - Optional abort signal for cancellation
   */
  async comparePlayers(names, signal) {
    if (!Array.isArray(names) || names.length < 2 || names.length > 4) {
      throw new Error("Must provide between 2 and 4 player names");
    }

    const validNames = names.filter((n) => n?.trim()).map((n) => n.trim());
    if (validNames.length < 2) {
      throw new Error("At least 2 valid player names required");
    }

    const namesParam = encodeURIComponent(validNames.join(","));
    const url = `${API_BASE}/players/compare?names=${namesParam}`;

    return fetchApi(url, { signal });
  },

  /**
   * Fetch leaderboard with pagination and filtering
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (1-indexed)
   * @param {number} params.pageSize - Results per page
   * @param {string} params.sortBy - Sort field (mmr, maxMmr, eventsPlayed)
   * @param {number} params.minMmr - Minimum MMR filter
   * @param {number} params.maxMmr - Maximum MMR filter
   * @param {string} params.search - Player name search query
   * @param {AbortSignal} signal - Optional abort signal for cancellation
   */
  async getLeaderboard(params = {}, signal) {
    const {
      page = 1,
      pageSize = 100,
      sortBy = "mmr",
      minMmr,
      maxMmr,
      search,
    } = params;

    // Convert page to skip for backend
    const skip = (page - 1) * pageSize;

    const queryParams = new URLSearchParams({
      skip: String(skip),
      pageSize: String(pageSize),
      sortBy,
    });

    if (minMmr !== undefined && minMmr !== null && minMmr !== "") {
      queryParams.set("minMmr", String(minMmr));
    }
    if (maxMmr !== undefined && maxMmr !== null && maxMmr !== "") {
      queryParams.set("maxMmr", String(maxMmr));
    }
    if (search?.trim()) {
      queryParams.set("search", search.trim());
    }

    const url = `${API_BASE}/leaderboard?${queryParams}`;

    return fetchApi(url, { signal });
  },
};

export default loungeApi;
