import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  clearRankThresholdCache,
  useRankThresholds,
} from "../useRankThresholds";
import { loungeApi } from "../../api/loungeApi";
import {
  RANK_THRESHOLDS,
  RANK_THRESHOLDS_12P_SEASON_3,
} from "../../utils/playerUtils";

vi.mock("../../api/loungeApi", async (importOriginal) => ({
  ...(await importOriginal()),
  loungeApi: { getPlayerStats: vi.fn() },
}));

describe("useRankThresholds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRankThresholdCache();
  });

  it("returns the bundled thresholds, then the API's once loaded", async () => {
    loungeApi.getPlayerStats.mockResolvedValue({
      ranks: { Iron: 0, Gold: 5000, Legend: 9000 },
    });

    const { result } = renderHook(() => useRankThresholds(3, 12));

    expect(result.current).toBe(RANK_THRESHOLDS_12P_SEASON_3);
    await waitFor(() =>
      expect(result.current.map((rank) => rank.name)).toEqual([
        "Iron",
        "Gold",
        "Legend",
      ]),
    );
    expect(loungeApi.getPlayerStats).toHaveBeenCalledWith({
      season: 3,
      game: "mkworld12p",
    });
  });

  it("asks for the mkworld ladder before season 2", async () => {
    loungeApi.getPlayerStats.mockResolvedValue({ ranks: { Ranked: 0 } });

    const { result } = renderHook(() => useRankThresholds(0, 24));

    await waitFor(() =>
      expect(result.current).toEqual([{ name: "Ranked", min: 0, max: Infinity }]),
    );
    expect(loungeApi.getPlayerStats).toHaveBeenCalledWith({
      season: 0,
      game: "mkworld",
    });
  });

  it("keeps the bundled thresholds when the API fails", async () => {
    loungeApi.getPlayerStats.mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => useRankThresholds(1, 24));

    await waitFor(() => expect(loungeApi.getPlayerStats).toHaveBeenCalled());
    expect(result.current).toBe(RANK_THRESHOLDS);
  });

  it("shares one request between components asking for the same ladder", async () => {
    loungeApi.getPlayerStats.mockResolvedValue({ ranks: { Iron: 0 } });

    renderHook(() => useRankThresholds(3, 24));
    const { result } = renderHook(() => useRankThresholds(3, 24));

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(loungeApi.getPlayerStats).toHaveBeenCalledTimes(1);
  });

  it("does not fetch while the season is unknown", () => {
    const { result } = renderHook(() => useRankThresholds(null, 24));

    expect(result.current).toBe(RANK_THRESHOLDS);
    expect(loungeApi.getPlayerStats).not.toHaveBeenCalled();
  });
});
