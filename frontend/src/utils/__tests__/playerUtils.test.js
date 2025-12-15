import { describe, it, expect } from "vitest";
import {
  getRankForMmrValue,
  getRankColor,
  getNextRank,
  formatTimeAgo,
} from "../playerUtils";

describe("playerUtils", () => {
  describe("getRankForMmrValue", () => {
    it("should return correct rank for MMR values", () => {
      expect(getRankForMmrValue(15000)).toBe("Grandmaster");
      expect(getRankForMmrValue(13000)).toBe("Master");
      expect(getRankForMmrValue(11000)).toBe("Diamond");
      expect(getRankForMmrValue(9000)).toBe("Sapphire");
      expect(getRankForMmrValue(7000)).toBe("Platinum");
      expect(getRankForMmrValue(5000)).toBe("Gold");
      expect(getRankForMmrValue(3000)).toBe("Silver");
      expect(getRankForMmrValue(1000)).toBe("Bronze");
      expect(getRankForMmrValue(0)).toBe("Iron");
    });

    it("should handle edge cases at rank boundaries", () => {
      expect(getRankForMmrValue(15000)).toBe("Grandmaster");
      expect(getRankForMmrValue(14999)).toBe("Master");
      expect(getRankForMmrValue(13000)).toBe("Master");
      expect(getRankForMmrValue(12999)).toBe("Diamond");
    });
  });

  describe("getRankColor", () => {
    it("should return correct colors for each rank", () => {
      expect(getRankColor("Grandmaster")).toBe("#E0115F");
      expect(getRankColor("Master")).toBe("#B026FF");
      expect(getRankColor("Diamond")).toBe("#00BFFF");
      expect(getRankColor("Sapphire")).toBe("#0F52BA");
      expect(getRankColor("Platinum")).toBe("#00CED1");
      expect(getRankColor("Gold")).toBe("#FFD700");
      expect(getRankColor("Silver")).toBe("#C0C0C0");
      expect(getRankColor("Bronze")).toBe("#CD7F32");
      expect(getRankColor("Iron")).toBe("#A19D94");
    });

    it("should return gray for unknown ranks", () => {
      expect(getRankColor("Unknown")).toBe("#888888");
      expect(getRankColor("")).toBe("#888888");
      expect(getRankColor(null)).toBe("#888888");
    });
  });

  describe("getNextRank", () => {
    it("should return correct next rank message", () => {
      const result1 = getNextRank(14000);
      expect(result1).toContain("1000 MMR");
      expect(result1).toContain("Grandmaster");

      const result2 = getNextRank(12000);
      expect(result2).toContain("1000 MMR");
      expect(result2).toContain("Master");
    });

    it("should handle Grandmaster rank", () => {
      const result = getNextRank(15500);
      expect(result).toContain("Grandmaster");
    });

    it("should handle low MMR values", () => {
      const result = getNextRank(500);
      expect(result).toContain("Bronze");
    });
  });

  describe("formatTimeAgo", () => {
    const now = Date.now();

    it("should format recent times correctly", () => {
      expect(formatTimeAgo(new Date(now - 1000 * 30))).toBe("30 seconds ago");
      expect(formatTimeAgo(new Date(now - 1000 * 60 * 5))).toBe(
        "5 minutes ago"
      );
      expect(formatTimeAgo(new Date(now - 1000 * 60 * 60 * 2))).toBe(
        "2 hours ago"
      );
    });

    it("should format days correctly", () => {
      expect(formatTimeAgo(new Date(now - 1000 * 60 * 60 * 24))).toBe(
        "1 day ago"
      );
      expect(formatTimeAgo(new Date(now - 1000 * 60 * 60 * 24 * 5))).toBe(
        "5 days ago"
      );
    });

    it("should handle edge cases", () => {
      expect(formatTimeAgo(new Date(now - 500))).toBe("0 seconds ago");
      expect(
        formatTimeAgo(new Date(now - 1000 * 60 * 60 * 24 * 365))
      ).toContain("days ago");
    });
  });
});
