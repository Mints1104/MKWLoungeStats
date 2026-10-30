import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import CareerView from "../CareerView";
import { useCareer } from "../../hooks/useCareer";
import { loungeApi } from "../../api/loungeApi";

vi.mock("../../api/loungeApi", async (importOriginal) => ({
  ...(await importOriginal()),
  loungeApi: { getPlayerDetails: vi.fn() },
}));

const notFound = () => {
  const err = new Error("No lounge records found");
  err.status = 404;
  return err;
};

const details = (extra) => ({
  rank: "Gold",
  mmr: 6500,
  maxMmr: 7000,
  overallRank: 900,
  eventsPlayed: 120,
  winRate: 0.52,
  averageScore: 71.25,
  ...extra,
});

// As on the profile page: the hook lives in the page, the card can come and go
function Career({ playerName = "Guti", showCard = true, ...props }) {
  const career = useCareer(playerName);
  return showCard ?
      <CareerView career={career} playerName={playerName} {...props} />
    : null;
}

describe("CareerView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stays collapsed, without requests, until opened", () => {
    render(<Career season={3} mmrType={24} onSelectLadder={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Show all seasons" })).toBeTruthy();
    expect(loungeApi.getPlayerDetails).not.toHaveBeenCalled();
  });

  it("lists every ladder the player has records on", async () => {
    loungeApi.getPlayerDetails.mockImplementation(async (name, season, mmrType) => {
      if (season === 3 && mmrType === 24) return details({ mmr: 9000 });
      if (season === 1) return details({ rank: "Diamond" });
      // Never played: the API sends a 0-event placement record
      if (season === 0) {
        return details({ rank: "Placement", eventsPlayed: 0, mmr: null });
      }
      throw notFound();
    });
    const onSelectLadder = vi.fn();

    render(
      <Career season={3} mmrType={24} onSelectLadder={onSelectLadder} />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Show all seasons" }));
    });

    // Seasons 3, 2 (24p + 12p each), 1 and 0
    expect(loungeApi.getPlayerDetails).toHaveBeenCalledTimes(6);
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain("Season 3");
    expect(rows[0].textContent).toContain("24p");
    expect(rows[0].getAttribute("aria-current")).toBe("true");
    expect(rows[1].textContent).toContain("Combined");
    expect(rows[1].textContent).toContain("Diamond");

    fireEvent.click(screen.getByRole("button", { name: "View Season 1 Combined" }));
    expect(onSelectLadder).toHaveBeenCalledWith(1, null);
  });

  it("says when some seasons failed to load, and retries", async () => {
    loungeApi.getPlayerDetails.mockImplementation(async (name, season) => {
      if (season === 3) throw new Error("Request timeout - please try again");
      throw notFound();
    });

    render(<Career season={3} mmrType={24} onSelectLadder={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Show all seasons" }));
    });

    expect(screen.getByRole("status").textContent).toContain(
      "2 seasons couldn't be loaded.",
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    });
    expect(loungeApi.getPlayerDetails).toHaveBeenCalledTimes(12);
  });

  it("stays open and loaded when the card remounts (the profile reloading)", async () => {
    loungeApi.getPlayerDetails.mockImplementation(async (name, season, mmrType) => {
      if (season === 3 && mmrType === 24) return details();
      throw notFound();
    });
    const props = { season: 3, mmrType: 24, onSelectLadder: vi.fn() };

    const { rerender } = render(<Career {...props} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Show all seasons" }));
    });

    rerender(<Career {...props} showCard={false} />);
    rerender(<Career {...props} season={2} />);

    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(2);
    expect(loungeApi.getPlayerDetails).toHaveBeenCalledTimes(6);
  });

  it("starts collapsed again for a different player", async () => {
    loungeApi.getPlayerDetails.mockResolvedValue(details());
    const props = { season: 3, mmrType: 24, onSelectLadder: vi.fn() };

    const { rerender } = render(<Career {...props} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Show all seasons" }));
    });
    rerender(<Career {...props} playerName="Someone Else" />);

    expect(screen.getByRole("button", { name: "Show all seasons" })).toBeTruthy();
  });
});
