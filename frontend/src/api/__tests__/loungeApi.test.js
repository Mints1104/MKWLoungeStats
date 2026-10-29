import { describe, it, expect, vi, afterEach } from "vitest";
import { getGameId, loungeApi } from "../loungeApi";

const jsonResponse = (body) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("getGameId", () => {
  it("uses the single mkworld ladder before season 2", () => {
    expect(getGameId(0, 24)).toBe("mkworld");
    expect(getGameId(1, 12)).toBe("mkworld");
  });

  it("uses the split 12p / 24p ladders from season 2", () => {
    expect(getGameId(2, 12)).toBe("mkworld12p");
    expect(getGameId(3, 24)).toBe("mkworld24p");
    expect(getGameId("3")).toBe("mkworld24p");
  });
});

describe("loungeApi.getLeaderboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const requestedGame = async (params) => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ data: [], totalCount: 0 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await loungeApi.getLeaderboard(params);

    const url = new URL(fetchMock.mock.calls[0][0], "http://localhost");
    return url.searchParams.get("game");
  };

  it("requests the mkworld ladder for pre-split seasons", async () => {
    expect(await requestedGame({ season: 1, mmrType: 24 })).toBe("mkworld");
  });

  it("requests the per-format ladder for split seasons", async () => {
    expect(await requestedGame({ season: 3, mmrType: 12 })).toBe("mkworld12p");
  });
});
