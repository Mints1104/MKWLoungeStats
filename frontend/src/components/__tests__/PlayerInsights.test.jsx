import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PlayerInsights from "../PlayerInsights";
import { loungeApi } from "../../api/loungeApi";
import { clearPartnerNameCache } from "../../hooks/usePartnerNames";

vi.mock("../../api/loungeApi", async (importOriginal) => ({
  ...(await importOriginal()),
  loungeApi: { getTableById: vi.fn() },
}));

const table = (changeId, mmrDelta, extra = {}) => ({
  reason: "Table",
  changeId,
  mmrDelta,
  newMmr: 6000 + changeId,
  score: 70,
  rank: 3,
  time: "2026-10-01T12:00:00Z",
  ...extra,
});

const renderInsights = (events) =>
  render(
    <MemoryRouter>
      <PlayerInsights events={events} season={3} mmrType={24} />
    </MemoryRouter>,
  );

describe("PlayerInsights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPartnerNameCache();
  });

  it("shows form and streaks", () => {
    loungeApi.getTableById.mockResolvedValue({ teams: [] });

    renderInsights([table(3, 10), table(2, 5), table(1, -5)]);

    expect(screen.getByText("2 wins")).toBeTruthy();
    expect(screen.getAllByText("Win", { selector: ".sr-only" })).toHaveLength(2);
    expect(screen.getByText("Loss", { selector: ".sr-only" })).toBeTruthy();
  });

  it("names partners from a table they shared, linking to their profile", async () => {
    loungeApi.getTableById.mockResolvedValue({
      teams: [
        {
          scores: [
            { playerId: 1, playerName: "Me" },
            { playerId: 53423, playerName: "Partner One" },
          ],
        },
      ],
    });

    renderInsights([
      table(2, 10, { partnerIds: [53423], partnerScores: [80] }),
      table(1, -5, { partnerIds: [53423], partnerScores: [60] }),
    ]);

    expect(screen.getByText("Player #53423")).toBeTruthy();
    const link = await screen.findByRole("link", { name: "Partner One" });
    expect(link.getAttribute("href")).toBe(
      "/player/Partner%20One?season=3&mmrType=24",
    );
    expect(loungeApi.getTableById).toHaveBeenCalledWith(2);
  });

  it("renders nothing without table events", () => {
    const { container } = renderInsights([]);

    expect(container.textContent).toBe("");
  });
});
