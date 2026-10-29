import { describe, it, expect } from "vitest";
import { isScrollKeyOnPath } from "../scrollKeys";

describe("isScrollKeyOnPath", () => {
  it("matches the path itself and the path with a query", () => {
    expect(isScrollKeyOnPath("/leaderboard", "/leaderboard")).toBe(true);
    expect(isScrollKeyOnPath("/leaderboard?page=2", "/leaderboard")).toBe(true);
  });

  it("does not match a longer path that shares the prefix", () => {
    expect(isScrollKeyOnPath("/player/Bobby", "/player/Bob")).toBe(false);
    expect(isScrollKeyOnPath("/player/Bobby?season=3", "/player/Bob")).toBe(
      false,
    );
    expect(isScrollKeyOnPath("/table/12345", "/table/123")).toBe(false);
  });
});
