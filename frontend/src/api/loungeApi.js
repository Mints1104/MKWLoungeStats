/**
 * Centralized API service for Mario Kart Lounge endpoints
 * Handles all HTTP requests with consistent error handling and response parsing
 */
import logger from "../utils/logger.js";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

/**
 * Combine multiple abort signals
 */
function combineAbortSignals(signals) {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

/**
 * Base fetch wrapper with error handling, retry logic, and timeout
 */
async function fetchApi(url, options = {}, retries = 2, timeout = 30000) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const timeoutController = new AbortController();
    let timeoutId;

    try {
      // Create timeout controller
      timeoutId = setTimeout(() => timeoutController.abort(), timeout);

      // Combine timeout with any existing signal
      const combinedSignal = options.signal
        ? combineAbortSignals([options.signal, timeoutController.signal])
        : timeoutController.signal;

      // Clear timeout if request is aborted
      combinedSignal.addEventListener("abort", () => clearTimeout(timeoutId), {
        once: true,
      });

      const response = await fetch(url, { ...options, signal: combinedSignal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
        error.status = response.status;
        throw error;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle AbortError
      if (error.name === "AbortError") {
        // If timeout controller aborted, it was a timeout
        if (timeoutController.signal.aborted) {
          logger.warn("Request timeout:", url);
          throw new Error("Request timeout - please try again");
        }
        // Otherwise it's a user abort (navigation, etc.) - just rethrow silently
        throw error;
      }

      lastError = error;
      logger.warn(
        `API request failed (attempt ${attempt + 1}/${retries + 1}):`,
        url,
        error.message
      );

      // Don't retry on 4xx errors (client errors)
      if (error.status && error.status >= 400 && error.status < 500) {
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
    logger.api("GET", `/player/details/${encodedName}`);
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

    logger.api("GET", `/players/compare?names=${validNames.join(",")}`);
    const namesParam = validNames.map((n) => encodeURIComponent(n)).join(",");
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

    logger.api("GET", `/leaderboard?${queryParams}`);
    const url = `${API_BASE}/leaderboard?${queryParams}`;

    return fetchApi(url, { signal });
  },
};

export default loungeApi;
