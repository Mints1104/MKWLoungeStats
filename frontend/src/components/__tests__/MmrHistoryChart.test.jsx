import { cloneElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import MmrHistoryChart from "../MmrHistoryChart";
import { calculateMmrHistoryData } from "../../utils/chartUtils";

// The point the mocked Tooltip renders its content for
const tooltip = vi.hoisted(() => ({ point: null }));

vi.mock("recharts", () => {
  const passthrough = ({ children }) => <div>{children}</div>;
  const empty = () => null;
  return {
    ResponsiveContainer: passthrough,
    LineChart: passthrough,
    CartesianGrid: empty,
    YAxis: empty,
    Line: empty,
    XAxis: ({ dataKey, type }) => (
      <span data-testid="x-axis">{`${dataKey}:${type ?? "category"}`}</span>
    ),
    Tooltip: ({ content }) =>
      tooltip.point ?
        cloneElement(content, { active: true, payload: [{ payload: tooltip.point }] })
      : null,
    ReferenceLine: ({ label }) => <span data-testid="rank-line">{label.value}</span>,
    ReferenceDot: ({ label }) => <span data-testid="peak">{label.value}</span>,
    Brush: () => <span data-testid="brush" />,
  };
});

const thresholds = [
  { name: "Silver", min: 4000, max: 5999 },
  { name: "Gold", min: 6000, max: 7999 },
  { name: "Platinum", min: 8000, max: Infinity },
];

// Newest first, as the API sends mmrChanges
const changes = [
  { reason: "TableDelete", changeId: 2, newMmr: 6100, mmrDelta: 50, time: "2026-07-04T00:00:00Z" },
  { reason: "Strike", changeId: 9, newMmr: 6050, mmrDelta: -100, time: "2026-07-03T00:00:00Z" },
  { reason: "Table", changeId: 2, newMmr: 6150, mmrDelta: -50, score: 40, rank: 9, tier: "B", numPlayers: 24, numTeams: 12, time: "2026-07-02T00:00:00Z" },
  { reason: "Table", changeId: 1, newMmr: 5950, mmrDelta: 30, score: 90, rank: 2, tier: "A", numPlayers: 24, numTeams: 24, time: "2026-07-01T00:00:00Z" },
];

const historyOf = (mmrChanges) =>
  calculateMmrHistoryData(mmrChanges, () => ({ color: "gold" }), "test").mmrHistoryData;

const renderChart = (data = historyOf(changes)) =>
  render(<MmrHistoryChart data={data} gradientId="g-test" thresholds={thresholds} />);

describe("MmrHistoryChart", () => {
  beforeEach(() => {
    sessionStorage.clear();
    tooltip.point = null;
  });

  it("plots by date by default and can switch to event numbers", () => {
    renderChart();

    expect(screen.getByTestId("x-axis").textContent).toBe("time:number");

    fireEvent.click(screen.getByRole("button", { name: "By event" }));

    expect(screen.getByTestId("x-axis").textContent).toBe("event:category");
    expect(sessionStorage.getItem("mmrChartXModePref")).toBe("event");
  });

  it("draws rank lines inside the plotted range and can hide them", () => {
    renderChart();

    expect(screen.getAllByTestId("rank-line").map((line) => line.textContent)).toEqual([
      "Gold 6000",
    ]);

    fireEvent.click(screen.getByRole("checkbox", { name: "Rank lines" }));

    expect(screen.queryByTestId("rank-line")).toBeNull();
    expect(sessionStorage.getItem("mmrChartRankLinesPref")).toBe("false");
  });

  it("marks the peak", () => {
    renderChart();

    expect(screen.getByTestId("peak").textContent).toBe("Peak 6150");
  });

  it("explains a deleted table in the tooltip", () => {
    const data = historyOf(changes);
    tooltip.point = data[1];

    renderChart(data);

    const text = document.querySelector(".mmr-tooltip").textContent;
    expect(text).toContain("Scored 40 · 9th");
    expect(text).toContain("Tier B · 2v2");
    expect(text).toContain("Table later deleted (not counted in stats)");
    expect(text).toContain("-50 MMR");
  });

  it("offers the range picker only for long seasons", () => {
    renderChart();
    expect(screen.queryByTestId("brush")).toBeNull();

    const long = Array.from({ length: 30 }, (_, index) => ({
      reason: "Table",
      changeId: 100 - index,
      newMmr: 5000 + index,
      mmrDelta: 1,
      time: new Date(Date.UTC(2026, 6, 30 - index)).toISOString(),
    }));
    renderChart(historyOf(long));

    expect(screen.getByTestId("brush")).toBeTruthy();
  });

  it("says when there is nothing to plot", () => {
    renderChart([]);

    expect(screen.getByText("No MMR changes this season yet.")).toBeTruthy();
  });
});
