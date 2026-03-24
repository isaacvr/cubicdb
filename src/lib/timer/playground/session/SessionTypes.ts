import type { Session } from "@lib/interfaces";

export interface SessionWithStats extends Session {
  solveCount: number;
  lastSolve?: Date;
  createdAt: Date;
}

export function createSession(name: string): SessionWithStats {
  return {
    _id: `session-${Date.now()}-${Math.random()}`,
    name,
    createdAt: new Date(),
    solveCount: 0,
    settings: {
      hasInspection: true,
      inspection: 15,
      mode: "333",
    } as any,
  };
}
