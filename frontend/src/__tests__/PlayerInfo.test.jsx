import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PlayerInfo from "../PlayerInfo";
import { SettingsProvider } from "../context/SettingsContext.jsx";

vi.mock("../components/PlayerDetailView", () => ({
  default: ({ playerDetails, season, mmrType }) => (
    <div data-testid="detail-view">
      {`${playerDetails.name} season ${season} ${mmrType}p`}
    </div>
  ),
}));

const renderPlayerInfo = () =>
  render(
    <SettingsProvider>
      <PlayerInfo />
    </SettingsProvider>,
  );

describe("PlayerInfo restore", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("restores the last player with the season and MMR type it was fetched for", () => {
    sessionStorage.setItem(
      "lastPlayerDetails",
      JSON.stringify({
        name: "Twelver",
        data: { name: "Twelver" },
        season: 2,
        mmrType: 12,
      }),
    );
    // A later season selection must not override the restored data's own
    sessionStorage.setItem("playerInfoSeason", "3");

    renderPlayerInfo();

    expect(screen.getByTestId("detail-view").textContent).toBe(
      "Twelver season 2 12p",
    );
    expect(screen.getByLabelText("Select MMR type").value).toBe("12");
    expect(screen.getByLabelText("Select Season").value).toBe("2");
  });

  it("falls back to the saved selection for entries stored without season/MMR type", () => {
    sessionStorage.setItem(
      "lastPlayerDetails",
      JSON.stringify({ name: "Legacy", data: { name: "Legacy" } }),
    );
    sessionStorage.setItem("playerInfoSeason", "3");
    sessionStorage.setItem("playerInfoMmrType", "12");

    renderPlayerInfo();

    expect(screen.getByTestId("detail-view").textContent).toBe(
      "Legacy season 3 12p",
    );
  });
});
