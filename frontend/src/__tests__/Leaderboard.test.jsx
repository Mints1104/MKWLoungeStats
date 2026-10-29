import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import Leaderboard from "../Leaderboard";
import { SettingsProvider } from "../context/SettingsContext.jsx";
import { loungeApi } from "../api/loungeApi";

vi.mock("../api/loungeApi", () => ({
  loungeApi: {
    getLeaderboard: vi.fn(async () => ({ data: [], totalCount: 0 })),
  },
}));

const renderAt = (url) =>
  render(
    <SettingsProvider>
      <MemoryRouter initialEntries={[url]}>
        <Link to="/leaderboard">Leaderboard nav link</Link>
        <Routes>
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </MemoryRouter>
    </SettingsProvider>,
  );

describe("Leaderboard URL sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
