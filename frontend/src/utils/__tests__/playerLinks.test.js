import { describe, it, expect } from "vitest";
import {
  getComparePath,
  getProfilePath,
  parseCompareNames,
} from "../playerLinks";

describe("playerLinks", () => {
  it("builds profile links, leaving out the ladder before season 2", () => {
    expect(getProfilePath("J.R. Smith", 3, 12)).toBe(
      "/player/J.R.%20Smith?season=3&mmrType=12",
    );
    expect(getProfilePath("Guti", 1, 24)).toBe("/player/Guti?season=1");
  });

  it("builds compare links with trimmed names in order", () => {
    expect(getComparePath([" Zed", "Amy ", ""], 3, 24)).toBe(
      "/compare?names=Zed%2CAmy&season=3&mmrType=24",
    );
  });

  it("parses compare names, dropping blanks and extras", () => {
    expect(parseCompareNames(" Zed,,Amy , Bo,Cy,Di")).toEqual([
      "Zed",
      "Amy",
      "Bo",
      "Cy",
    ]);
    expect(parseCompareNames(null)).toEqual([]);
  });
});
