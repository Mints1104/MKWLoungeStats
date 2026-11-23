import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAbortableRequest } from "../useAbortableRequest";

const pending = () => {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const abortable = (deferred) => (signal) =>
  new Promise((resolve, reject) => {
    signal.addEventListener("abort", () =>
      reject(new DOMException("Aborted", "AbortError")),
    );
    deferred.promise.then(resolve);
  });

describe("useAbortableRequest", () => {
  it("stays loading while a newer request is pending after the older one is aborted", async () => {
    const { result } = renderHook(() => useAbortableRequest());
    const first = pending();
    const second = pending();

    let firstRun;
    let secondRun;
    act(() => {
      firstRun = result.current.run(abortable(first));
    });
    act(() => {
      secondRun = result.current.run(abortable(second));
    });
    await act(async () => {
      expect(await firstRun).toBeNull();
    });
    expect(result.current.loading).toBe(true);

    await act(async () => {
      second.resolve("done");
      expect(await secondRun).toBe("done");
    });
    expect(result.current.loading).toBe(false);
  });

  it("stops loading when aborted directly", async () => {
    const { result } = renderHook(() => useAbortableRequest());
    let run;
    act(() => {
      run = result.current.run(abortable(pending()));
    });
    await act(async () => {
      result.current.abort();
      await run;
    });
    expect(result.current.loading).toBe(false);
  });
});
