import { describe, it, expect, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import FavouriteButton from "../FavouriteButton";

describe("FavouriteButton", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("adds and removes a favourite, saved in localStorage", () => {
    render(<FavouriteButton name="Guti" />);

    const add = screen.getByRole("button", { name: "Add Guti to favourites" });
    expect(add.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(add);

    const remove = screen.getByRole("button", {
      name: "Remove Guti from favourites",
    });
    expect(remove.getAttribute("aria-pressed")).toBe("true");
    expect(JSON.parse(localStorage.getItem("favouritePlayers"))).toEqual(["Guti"]);

    fireEvent.click(remove);

    expect(JSON.parse(localStorage.getItem("favouritePlayers"))).toEqual([]);
  });

  it("matches names case-insensitively and keeps every button in sync", () => {
    localStorage.setItem("favouritePlayers", JSON.stringify(["guti"]));
    render(
      <>
        <FavouriteButton name="Guti" />
        <FavouriteButton name="GUTI" />
      </>,
    );

    expect(
      screen.getAllByRole("button", { pressed: true }),
    ).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Remove Guti from favourites" }));

    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
  });
});
