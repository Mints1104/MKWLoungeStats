import { describe, it, expect } from "vitest";
import {
  getRankForMmrValue,
  getRankColor,
  getNextRank,
  formatTimeAgo,
} from "../playerUtils";

describe("playerUtils", () => {
  describe("getRankForMmrValue", () => {
    it("should return rank objects for MMR values", () => {
      expect(getRankForMmrValue(15500).name).toBe("Grandmaster");
      expect(getRankForMmrValue(14500).name).toBe("Master");
      expect(getRankForMmrValue(13000).name).toBe("Diamond");
      expect(getRankForMmrValue(10000).name).toBe("Sapphire");
      expect(getRankForMmrValue(8000).name).toBe("Platinum");
      expect(getRankForMmrValue(7000).name).toBe("Gold");
      expect(getRankForMmrValue(5000).name).toBe("Silver");
      expect(getRankForMmrValue(3000).name).toBe("Bronze");
      expect(getRankForMmrValue(2000).name).toBe("Bronze");
      expect(getRankForMmrValue(0).name).toBe("Iron");
    });

    it("should handle edge cases at rank boundaries", () => {
      expect(getRankForMmrValue(15500).name).toBe("Grandmaster");
      expect(getRankForMmrValue(15499).name).toBe("Master");
      expect(getRankForMmrValue(14500).name).toBe("Master");
      expect(getRankForMmrValue(14499).name).toBe("Diamond");
    });

    it("should use season 3 thresholds for 12-player MMR", () => {
      expect(getRankForMmrValue(7999, 3, 12).name).toBe("Gold");
      expect(getRankForMmrValue(8000, 3, 12).name).toBe("Platinum");
      expect(getRankForMmrValue(9499, 3, 12).name).toBe("Platinum");
      expect(getRankForMmrValue(9500, 3, 12).name).toBe("Sapphire");
      expect(getRankForMmrValue(14999, 3, 12).name).toBe("Master");
      expect(getRankForMmrValue(15000, 3, 12).name).toBe("Grandmaster");
    });

    it("should preserve season 2 thresholds for 12-player MMR", () => {
      expect(getRankForMmrValue(7500, 2, 12).name).toBe("Platinum");
      expect(getRankForMmrValue(9000, 2, 12).name).toBe("Sapphire");
      expect(getRankForMmrValue(14500, 2, 12).name).toBe("Grandmaster");
    });
  });

  describe("getRankColor", () => {
    it("should return correct colors for each rank", () => {
      expect(getRankColor("Grandmaster")).toBe("#A3022C");
      expect(getRankColor("Master")).toBe("#9370DB");
      expect(getRankColor("Diamond")).toBe("#B9F2FF");
      expect(getRankColor("Sapphire")).toBe("#286CD3");
      expect(getRankColor("Platinum")).toBe("#3FABB8");
      expect(getRankColor("Gold")).toBe("#F1C232");
      expect(getRankColor("Silver")).toBe("#CCCCCC");
      expect(getRankColor("Bronze")).toBe("#B45F06");
      expect(getRankColor("Iron")).toBe("#817876");
    });

    it("should return gray for unknown ranks", () => {
      expect(getRankColor("Unknown")).toBe("#e5e7eb");
      expect(getRankColor("")).toBe("#e5e7eb");
      expect(getRankColor(null)).toBe("#e5e7eb");
    });
  });

  describe("getNextRank", () => {
    it("should return correct next rank message", () => {
      const result1 = getNextRank(14500);
      expect(result1).toContain("Grandmaster");

      const result2 = getNextRank(13000);
      expect(result2).toContain("Master");
    });

    it("should handle Grandmaster rank", () => {
      const result = getNextRank(15500);
      expect(result).toBe("");
    });

    it("should handle low MMR values", () => {
      const result = getNextRank(500);
      expect(result).toContain("Bronze");
    });
  });

  describe("formatTimeAgo", () => {
    const now = Date.now();

    it("should format recent times correctly", () => {
      expect(formatTimeAgo(new Date(now - 1000 * 30))).toBe("30s ago");
      expect(formatTimeAgo(new Date(now - 1000 * 60 * 5))).toBe("5m ago");
      expect(formatTimeAgo(new Date(now - 1000 * 60 * 60 * 2))).toBe("2h ago");
    });

    it("should format days correctly", () => {
      expect(formatTimeAgo(new Date(now - 1000 * 60 * 60 * 24))).toBe("1d ago");
      expect(formatTimeAgo(new Date(now - 1000 * 60 * 60 * 24 * 5))).toBe(
        "5d ago"
      );
    });

    it("should handle edge cases", () => {
      expect(formatTimeAgo(new Date(now - 500))).toBe("0s ago");
      const longAgo = formatTimeAgo(new Date(now - 1000 * 60 * 60 * 24 * 365));
      expect(longAgo.endsWith("d ago")).toBe(true);
    });
  });
});
