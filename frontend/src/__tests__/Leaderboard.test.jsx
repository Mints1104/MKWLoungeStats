import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import Leaderboard from "../Leaderboard";
import { SettingsProvider } from "../context/SettingsContext.jsx";
import { loungeApi } from "../api/loungeApi";

vi.mock("../api/loungeApi", () => ({
  loungeApi: {
    getLeaderboard: vi.fn(async () => ({ data: [], totalCount: 0 })),
  },
}));

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

const renderAt = (url) =>
  render(
    <SettingsProvider>
      <MemoryRouter initialEntries={[url]}>
        <Link to="/leaderboard">Leaderboard nav link</Link>
        <Routes>
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/player/:playerName" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </SettingsProvider>,
  );

const leaderboardRow = (name, overallRank, extra = {}) => ({
  id: overallRank,
  name,
  overallRank,
  countryCode: "JP",
  mmr: 15000 - overallRank,
  maxMmr: 15500,
  mmrRank: { name: "Master" },
  maxMmrRank: { name: "Grandmaster" },
  lastWeekRankChange: 0,
  winRate: 0.6,
  eventsPlayed: 100,
  ...extra,
});

describe("Leaderboard table", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loungeApi.getLeaderboard.mockResolvedValue({
      data: [
        leaderboardRow("Akagane", 1),
        leaderboardRow("Guti", 2, { winRate: undefined, mmrRank: undefined }),
      ],
      totalCount: 120,
    });
  });

  it("renders players, including rows with missing fields", async () => {
    renderAt("/leaderboard");

    expect(
      await screen.findByRole("button", { name: "View profile for Akagane" }),
    ).toBeTruthy();
    expect(screen.getByText("60.0%")).toBeTruthy();
    expect(screen.getByText("N/A")).toBeTruthy();
    expect(screen.getByText("Page 1 of 3")).toBeTruthy();
  });

  it("opens a player's profile for the selected season and ladder", async () => {
    renderAt("/leaderboard?season=2&mmrType=12");

    const profileButton = await screen.findByRole("button", {
      name: "View profile for Guti",
    });
    await act(async () => {
      fireEvent.click(profileButton);
    });

    expect(screen.getByTestId("location").textContent).toBe(
      "/player/Guti?season=2&mmrType=12",
    );
  });

  it("requests the next page", async () => {
    renderAt("/leaderboard");
    await screen.findByText("Page 1 of 3");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Next →" }));
    });

    await waitFor(() =>
      expect(loungeApi.getLeaderboard).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, pageSize: 50 }),
        expect.anything(),
      ),
    );
  });
});

describe("Leaderboard URL sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loungeApi.getLeaderboard.mockResolvedValue({ data: [], totalCount: 0 });
  });

  it("reads filters from the URL on load", async () => {
    renderAt("/leaderboard?minMmr=8000");

    expect(screen.getByLabelText("Min MMR").value).toBe("8000");
    await waitFor(() =>
      expect(loungeApi.getLeaderboard).toHaveBeenCalledWith(
        expect.objectContaining({ minMmr: "8000" }),
        expect.anything(),
      ),
    );
  });

  it("resets filters when the nav link to the leaderboard is clicked", async () => {
    renderAt("/leaderboard?minMmr=8000&country=JP");

    await act(async () => {
      fireEvent.click(screen.getByText("Leaderboard nav link"));
    });

    expect(screen.getByLabelText("Min MMR").value).toBe("");
    expect(screen.getByLabelText("Country").value).toBe("");
    await waitFor(() =>
      expect(loungeApi.getLeaderboard).toHaveBeenLastCalledWith(
        expect.objectContaining({ minMmr: "", country: "" }),
        expect.anything(),
      ),
    );
  });

  it("keeps filters typed on the page (its own URL updates do not reset it)", async () => {
    renderAt("/leaderboard");

    await act(async () => {
      fireEvent.change(screen.getByLabelText("Min MMR"), {
        target: { value: "9000" },
      });
    });

    expect(screen.getByLabelText("Min MMR").value).toBe("9000");
    await waitFor(() =>
      expect(loungeApi.getLeaderboard).toHaveBeenLastCalledWith(
        expect.objectContaining({ minMmr: "9000" }),
        expect.anything(),
      ),
    );
  });
});
