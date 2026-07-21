import { describe, expect, it, vi } from "vitest";

const runtime = {
  getSolveFeature: vi.fn((sessionId: string) => ({
    sessionId,
    items: [],
    loading: false,
    error: null,
    load: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  })),
};

vi.mock("$lib/timer/context/timerRuntimeContext", () => ({
  getTimerRuntimeContext: () => runtime,
}));

describe("useSolve", () => {
  it("normalizes session id sources before resolving the runtime feature", async () => {
    const { useSolve } = await import("./useSolve");
    const solves = useSolve(() => 1 as unknown as string);

    expect(solves.sessionId).toBe("1");
    expect(solves.items).toEqual([]);
    expect(runtime.getSolveFeature).toHaveBeenCalledWith("1");
  });
});
