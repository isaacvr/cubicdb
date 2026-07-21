import { describe, expect, it, vi } from "vitest";

const runtimeFeature = {
  sessionId: "session:one",
  items: [{ _id: "solve:one", selected: false }],
  solves: [{ _id: "solve:one", selected: false }],
  selectedSolves: [],
  selectedCount: 0,
  loading: false,
  error: null,
  toggleSelected: vi.fn(() => 1),
  selectAll: vi.fn(() => 1),
  invertSelection: vi.fn(() => 0),
  selectInterval: vi.fn(() => 1),
  clearSelection: vi.fn(() => 0),
  removeSelected: vi.fn(),
  load: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
};

const runtime = {
  getSolveFeature: vi.fn((sessionId: string) => ({
    ...runtimeFeature,
    sessionId,
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
    expect(solves.solves).toEqual([{ _id: "solve:one", selected: false }]);
    expect(runtime.getSolveFeature).toHaveBeenCalledWith("1");
  });

  it("proxies solve-list selection operations to the runtime feature", async () => {
    const { useSolve } = await import("./useSolve");
    const solves = useSolve("session:one");
    const solve = { _id: "solve:one", selected: false } as any;

    expect(solves.toggleSelected(solve)).toBe(1);
    expect(solves.selectAll([solve])).toBe(1);
    expect(solves.invertSelection([solve])).toBe(0);
    expect(solves.selectInterval([solve])).toBe(1);
    expect(solves.clearSelection()).toBe(0);
    await solves.removeSelected();

    expect(runtimeFeature.toggleSelected).toHaveBeenCalledWith(solve);
    expect(runtimeFeature.removeSelected).toHaveBeenCalledOnce();
  });
});
