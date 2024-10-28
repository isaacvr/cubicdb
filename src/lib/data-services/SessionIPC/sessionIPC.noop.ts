import type { Session } from "@interfaces";
import type { SessionIPC } from "./sessionIPC.interface";

export class SessionNoopIPC implements SessionIPC {
  private constructor() {}

  private static _instance: SessionNoopIPC | null = null;

  static getInstance() {
    if (!SessionNoopIPC._instance) {
      SessionNoopIPC._instance = new SessionNoopIPC();
    }

    return SessionNoopIPC._instance;
  }

  async getSessions() {
    return [];
  }

  async addSession(s: Session) {
    return s;
  }

  async removeSession(s: Session) {
    return s;
  }

  async renameSession(s: Session) {
    return s;
  }

  async updateSession(s: Session) {
    return s;
  }
}
