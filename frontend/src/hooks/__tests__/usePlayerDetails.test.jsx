import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import usePlayerDetails from "../usePlayerDetails";
import { loungeApi } from "../../api/loungeApi";

vi.mock("../../api/loungeApi", () => ({
  loungeApi: {
    getPlayerDetails: vi.fn(),
  },
}));

describe("usePlayerDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates empty player name and skips API call", async () => {
    const { result } = renderHook(() => usePlayerDetails());

    let response;
    await act(async () => {
      response = await result.current.fetchPlayerDetails("   ");
    });

    expect(response).toBeNull();
    expect(loungeApi.getPlayerDetails).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Please enter a name");
    expect(result.current.playerDetails).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("aborts previous request when a new one starts", async () => {
    let firstSignal;
    loungeApi.getPlayerDetails.mockImplementation(
      (name, season, mmrType, signal) => {
        if (name === "first") {
          firstSignal = signal;
          return new Promise((resolve, reject) => {
            signal.addEventListener("abort", () => {
              const err = new Error("Request was aborted");
              err.name = "AbortError";
              reject(err);
            });
          });
        }

        return Promise.resolve({ name: "second", mmr: 9200 });
      },
    );

    const { result } = renderHook(() => usePlayerDetails());

    let firstResult;
    await act(async () => {
      const firstPromise = result.current.fetchPlayerDetails("first");
      const secondPromise = result.current.fetchPlayerDetails("second");
      firstResult = await firstPromise;
      await secondPromise;
    });

    expect(firstSignal.aborted).toBe(true);
    expect(firstResult).toBeNull();
    expect(loungeApi.getPlayerDetails).toHaveBeenCalledTimes(2);
    expect(result.current.playerDetails).toEqual({ name: "second", mmr: 9200 });
    expect(result.current.error).toBe("");
    expect(result.current.loading).toBe(false);
  });

  it("maps 404 errors to a friendly message", async () => {
    loungeApi.getPlayerDetails.mockRejectedValueOnce(
      new Error("HTTP 404: Not Found"),
    );

    const { result } = renderHook(() => usePlayerDetails());

    await act(async () => {
      await result.current.fetchPlayerDetails("MissingPlayer");
    });

    expect(result.current.playerDetails).toBeNull();
    expect(result.current.error).toBe(
      'No lounge records found for "MissingPlayer"',
    );
    expect(result.current.loading).toBe(false);
  });

  it("updates loading state during successful fetch", async () => {
    let resolveRequest;
    loungeApi.getPlayerDetails.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const { result } = renderHook(() => usePlayerDetails());

    act(() => {
      void result.current.fetchPlayerDetails("Coach");
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    await act(async () => {
      resolveRequest({ name: "Coach", mmr: 10100 });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.playerDetails).toEqual({
        name: "Coach",
        mmr: 10100,
      });
      expect(result.current.error).toBe("");
    });
  });
});
