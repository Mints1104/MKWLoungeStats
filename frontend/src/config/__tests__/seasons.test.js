import { describe, it, expect } from "vitest";
import { CURRENT_SEASON, getSeasonLabel, SEASON_OPTIONS } from "../seasons";

describe("seasons", () => {
  it("labels the preseason and numbered seasons", () => {
    expect(getSeasonLabel(0)).toBe("Preseason");
    expect(getSeasonLabel(2)).toBe("Season 2");
  });

  it("lists every season from the current one down to the preseason", () => {
    expect(SEASON_OPTIONS).toHaveLength(CURRENT_SEASON + 1);
    expect(SEASON_OPTIONS[0]).toEqual({
      value: CURRENT_SEASON,
      label: `Season ${CURRENT_SEASON}`,
    });
    expect(SEASON_OPTIONS.at(-1)).toEqual({ value: 0, label: "Preseason" });
  });
});
