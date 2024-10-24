import type { Session } from "@interfaces";

export interface SessionIPC {
  getSessions: () => Promise<Session[]>;
  addSession: (s: Session) => Promise<Session>;
  removeSession: (s: Session) => Promise<Session>;
  renameSession: (s: Session) => Promise<Session>;
  updateSession: (s: Session) => Promise<Session>;
}
