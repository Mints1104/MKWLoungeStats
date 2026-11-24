import { describe, it, expect } from "vitest";
import {
  cleanRangeFilters,
  cleanRangeValue,
  parsePageParam,
  parsePageSizeParam,
} from "../leaderboardParams";
import {
  parseNullableMmrType,
  parseSeasonValue,
} from "../../hooks/useSeasonMmrSelection";
import { CURRENT_SEASON } from "../../config/seasons";

describe("leaderboard URL params", () => {
  it("keeps whole page numbers from 1, otherwise page 1", () => {
    expect(parsePageParam("4")).toBe(4);
    for (const bad of [null, "", "abc", "0", "-2", "1.5"]) {
      expect(parsePageParam(bad)).toBe(1);
    }
  });

  it("keeps only the page sizes the picker offers", () => {
    expect(parsePageSizeParam("25")).toBe(25);
    expect(parsePageSizeParam("100")).toBe(100);
    for (const bad of [null, "1000", "7", "abc"]) {
      expect(parsePageSizeParam(bad)).toBe(50);
    }
  });

  it("keeps range bounds the API accepts and drops the rest", () => {
    expect(cleanRangeValue(" 8000 ")).toBe("8000");
    expect(cleanRangeValue("007")).toBe("7");
    for (const bad of ["", "-5", "1.5", "1e3", "abc", undefined]) {
      expect(cleanRangeValue(bad)).toBe("");
    }
    expect(
      cleanRangeFilters(new URLSearchParams("minMmr=9000&maxMmr=-1")),
    ).toEqual({ minMmr: "9000", maxMmr: "", minEventsPlayed: "", maxEventsPlayed: "" });
  });
});

describe("season and ladder params", () => {
  it("falls back to the current season when the season is missing or invalid", () => {
    // Number(null) is 0: a profile link without ?season opened the preseason
    expect(parseSeasonValue(null)).toBe(CURRENT_SEASON);
    expect(parseSeasonValue("")).toBe(CURRENT_SEASON);
    expect(parseSeasonValue("x")).toBe(CURRENT_SEASON);
    expect(parseSeasonValue("1.5")).toBe(CURRENT_SEASON);
    expect(parseSeasonValue(String(CURRENT_SEASON + 1))).toBe(CURRENT_SEASON);
    expect(parseSeasonValue("0")).toBe(0);
    expect(parseSeasonValue(1)).toBe(1);
  });

  it("only knows the 12p and 24p ladders", () => {
    expect(parseNullableMmrType("12")).toBe(12);
    expect(parseNullableMmrType(24)).toBe(24);
    expect(parseNullableMmrType("13")).toBeNull();
    expect(parseNullableMmrType(null)).toBeNull();
  });
});
