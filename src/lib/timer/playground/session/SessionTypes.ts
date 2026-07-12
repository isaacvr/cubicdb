import type { Session, SessionSettings } from "@lib/interfaces";

export interface SessionWithStats extends Omit<Session, "settings"> {
  solveCount: number;
  lastSolve?: Date;
  createdAt: Date;
  settings: SessionSettings & {
    inspectionTime?: number;
    timerDisplay?: string;
  };
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
