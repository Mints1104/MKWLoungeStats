import { describe, it, expect, beforeEach } from "vitest";
import { getRememberedPlayerId, rememberPlayerId } from "../playerIds";
import { renameRecentSearch } from "../recentSearches";
import { renameFavourite } from "../../hooks/useFavourites";

describe("remembered player IDs and renames", () => {
  beforeEach(() => localStorage.clear());

  it("remembers the ID behind a name, case-insensitively", () => {
    rememberPlayerId("Absent", 16052);
    expect(getRememberedPlayerId("absent")).toBe(16052);
    expect(getRememberedPlayerId("Someone")).toBeNull();
    rememberPlayerId("", 1);
    rememberPlayerId("NoId", undefined);
    expect(getRememberedPlayerId("NoId")).toBeNull();
  });

  it("keeps the newest 200 names", () => {
    for (let id = 1; id <= 201; id += 1) rememberPlayerId(`p${id}`, id);
    expect(getRememberedPlayerId("p1")).toBeNull();
    expect(getRememberedPlayerId("p2")).toBe(2);
    expect(getRememberedPlayerId("p201")).toBe(201);
  });

  it("renames a favourite and a recent search in place", () => {
    localStorage.setItem("favouritePlayers", JSON.stringify(["A", "absent", "B"]));
    localStorage.setItem("recentPlayerSearches", JSON.stringify(["Absent", "C"]));

    renameFavourite("Absent", "Sam");
    renameRecentSearch("Absent", "Sam");

    expect(JSON.parse(localStorage.getItem("favouritePlayers"))).toEqual([
      "A",
      "Sam",
      "B",
    ]);
    expect(JSON.parse(localStorage.getItem("recentPlayerSearches"))).toEqual([
      "Sam",
      "C",
    ]);
  });

  it("doesn't list a player twice when the new name is already saved", () => {
    localStorage.setItem("favouritePlayers", JSON.stringify(["Sam", "Absent"]));
    renameFavourite("Absent", "Sam");
    expect(JSON.parse(localStorage.getItem("favouritePlayers"))).toEqual(["Sam"]);
  });
});
