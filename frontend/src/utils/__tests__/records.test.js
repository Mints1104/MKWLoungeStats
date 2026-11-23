import { describe, it, expect } from "vitest";
import { getPlaceLabel, getTierLabel, pickFormat } from "../records";

describe("records utils", () => {
  it("labels places with medals then ordinals", () => {
    expect([0, 1, 2, 3, 4, 10, 20, 21].map(getPlaceLabel)).toEqual([
      "🥇",
      "🥈",
      "🥉",
      "4th",
      "5th",
      "11th",
      "21st",
      "22nd",
    ]);
  });

  it("names the Squad Queue tier", () => {
    expect(getTierLabel("SQ")).toBe("Squad Queue");
    expect(getTierLabel("A")).toBe("Tier A");
  });

  it("falls back to FFA, then the first format", () => {
    const records = { formats: [{ format: "2v2" }, { format: "FFA" }] };
    expect(pickFormat(records, "2v2").format).toBe("2v2");
    expect(pickFormat(records, "6v6").format).toBe("FFA");
    expect(pickFormat({ formats: [{ format: "3v3" }] }, "FFA").format).toBe("3v3");
    expect(pickFormat(null, "FFA")).toBeNull();
  });
});
