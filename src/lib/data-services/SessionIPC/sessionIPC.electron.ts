import type { IPC, Session } from "@interfaces";
import type { SessionIPC } from "./sessionIPC.interface";

export class SessionElectronIPC implements SessionIPC {
  ipc: IPC;
  private constructor() {
    this.ipc = (<any>window).electronAPI as IPC;
  }

  private static _instance: SessionElectronIPC | null = null;

  static getInstance() {
    if (!SessionElectronIPC._instance) {
      SessionElectronIPC._instance = new SessionElectronIPC();
    }

    return SessionElectronIPC._instance;
  }

  getSessions() {
    return this.ipc.getSessions();
  }

  addSession(s: Session) {
    return this.ipc.addSession(s);
  }

  removeSession(s: Session) {
    return this.ipc.removeSession(s);
  }

  renameSession(s: Session) {
    return this.ipc.renameSession(s);
  }

  updateSession(s: Session) {
    return this.ipc.updateSession(s);
  }
}
