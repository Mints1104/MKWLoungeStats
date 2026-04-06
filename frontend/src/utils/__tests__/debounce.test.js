import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { debounce } from "../debounce";

// group related tests together
describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // define one specific behaviour
  it("calls the wrapped function once after the wait time", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced("first");

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(199);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("first");
  });

  it("resets the timer when called repeatedly", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced("a");
    vi.advanceTimersByTime(100);
    debounced("b");
    vi.advanceTimersByTime(100);
    debounced("c");

    vi.advanceTimersByTime(199);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("c");
  });

  it("preserves multiple arguments from the latest call", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 150);

    debounced("player", 24, { mode: "ffa" });
    debounced("player2", 12, { mode: "2v2" });

    vi.advanceTimersByTime(150);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("player2", 12, { mode: "2v2" });
  });
});
