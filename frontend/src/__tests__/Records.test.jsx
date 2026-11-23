import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Records from "../Records";
import { SettingsProvider } from "../context/SettingsContext.jsx";
import { loungeApi } from "../api/loungeApi";

vi.mock("../components/CountryFlag", () => ({ default: () => null }));

vi.mock("../api/loungeApi", async (importOriginal) => ({
  ...(await importOriginal()),
  loungeApi: { getRecords: vi.fn() },
}));

const player = (id, name) => ({ id, name, countryCode: "JP" });

const records = {
  season: 3,
  game: "mkworld24p",
  generatedAt: "2026-11-23T10:00:00Z",
  tableCount: 7348,
  formats: [
    {
      format: "FFA",
      tiers: [
        {
          tier: "X",
          records: [
            { score: 108, tableId: 1158571, createdOn: "", players: [player(1, "Mus")] },
            { score: 104, tableId: 1160152, createdOn: "", players: [player(2, "Masato Hayashi")] },
          ],
        },
        { tier: "SQ", records: [] },
      ],
    },
    {
      format: "2v2",
      tiers: [
        {
          tier: "X",
          records: [
            {
              score: 173,
              tableId: 42,
              createdOn: "",
              players: [player(3, "Li4z"), player(4, "Jojo77")],
            },
          ],
        },
      ],
    },
  ],
};

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

const renderRecords = (entry = "/records") =>
  render(
    <SettingsProvider>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/records" element={<Records />} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </SettingsProvider>,
  );

describe("Records", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    loungeApi.getRecords.mockResolvedValue(records);
  });

  it("shows FFA records per tier for the current season", async () => {
    renderRecords();

    const tierX = await screen.findByRole("region", { name: "Tier X" });
    expect(within(tierX).getByRole("link", { name: "Mus" }).getAttribute("href")).toBe(
      "/player/Mus?season=3&mmrType=24",
    );
    expect(
      within(tierX).getByRole("link", { name: /108 points/ }).getAttribute("href"),
    ).toBe("/table/1158571");
    expect(screen.getByRole("region", { name: "Squad Queue" })).toBeTruthy();
    expect(screen.getByText(/Built from 7,348 tables/)).toBeTruthy();
    expect(loungeApi.getRecords).toHaveBeenCalledWith(3, 24, expect.anything());
  });

  it("opens a team format from the URL and switches back to FFA", async () => {
    renderRecords("/records?format=2v2");

    const tierX = await screen.findByRole("region", { name: "Tier X" });
    expect(within(tierX).getByRole("link", { name: "Jojo77" })).toBeTruthy();
    expect(within(tierX).getByText("Team")).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "FFA" }));
    });
    expect(within(screen.getByRole("region", { name: "Tier X" })).getByText("Player")).toBeTruthy();
  });

  it("requests the mkworld ladder for pre-split seasons", async () => {
    renderRecords();
    await screen.findByRole("region", { name: "Tier X" });

    await act(async () => {
      fireEvent.change(screen.getByLabelText("Select Season"), {
        target: { value: "1" },
      });
    });

    expect(loungeApi.getRecords).toHaveBeenLastCalledWith(1, 24, expect.anything());
    expect(screen.queryByLabelText("Select MMR type")).toBeNull();
  });

  it("shows the error when records fail to load", async () => {
    loungeApi.getRecords.mockRejectedValue(new Error("Lounge API took too long"));
    renderRecords();

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Lounge API took too long",
    );
  });
});
