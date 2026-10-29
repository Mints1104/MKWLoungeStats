import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EventCard from "../EventCard";

const renderCard = (props) =>
  render(
    <MemoryRouter>
      <EventCard averageScore={70} avg12={null} avg24={null} {...props} />
    </MemoryRouter>,
  );

const tableEvent = {
  reason: "Table",
  changeId: 1148866,
  mmrDelta: -111,
  newMmr: 5844,
  score: 40,
  rank: 9,
  numPlayers: 24,
  numTeams: 12,
  tier: "C",
  time: new Date().toISOString(),
};

describe("EventCard", () => {
  it("marks a table that was later deleted", () => {
    renderCard({ event: tableEvent, tableWasDeleted: true });

    expect(screen.getByText("Table deleted (not counted in stats)")).toBeTruthy();
  });

  it("does not mark a table that still counts", () => {
    renderCard({ event: tableEvent });

    expect(screen.queryByText(/not counted in stats/)).toBeNull();
  });

  it("labels Penalty and StrikeDelete entries instead of Unknown", () => {
    const time = new Date().toISOString();
    renderCard({
      event: { reason: "Penalty", changeId: 1, mmrDelta: -23, newMmr: 9310, time },
    });
    renderCard({
      event: { reason: "StrikeDelete", changeId: 2, mmrDelta: 50, newMmr: 5629, time },
    });

    expect(screen.getByText("Penalty")).toBeTruthy();
    expect(screen.getByText("Strike Removed")).toBeTruthy();
    expect(screen.queryByText("Unknown")).toBeNull();
  });
});
