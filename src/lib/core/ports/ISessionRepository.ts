import type { Session } from "@interfaces";

export interface ISessionRepository {
  getSessions(): Promise<Session[]>;
  addSession(session: Session): Promise<Session>;
  updateSession(session: Session): Promise<Session>;
  removeSession(session: Session): Promise<Session>;
  createEmptySession(s?: Partial<Session>): Session;
}
