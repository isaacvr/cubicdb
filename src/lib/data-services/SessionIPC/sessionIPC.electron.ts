import type { IPC, Session } from "@interfaces";
import type { SessionIPC } from "./sessionIPC.interface";
import { sessions } from "@stores/sessions.store";

export class SessionElectronIPC implements SessionIPC {
  ipc: IPC;
  private constructor() {
    this.ipc = (<any>window).electronAPI as IPC;

    this.updateSessionStore();
  }

  private static _instance: SessionElectronIPC | null = null;

  private async updateSessionStore() {
    sessions.set(await this.getSessions());
  }

  static getInstance() {
    if (!SessionElectronIPC._instance) {
      SessionElectronIPC._instance = new SessionElectronIPC();
    }

    return SessionElectronIPC._instance;
  }

  getSessions() {
    return this.ipc.getSessions();
  }

  async addSession(s: Session) {
    let res = await this.ipc.addSession(s);
    await this.updateSessionStore();
    return res;
  }

  async removeSession(s: Session) {
    let res = await this.ipc.removeSession(s);
    await this.updateSessionStore();
    return res;
  }

  async renameSession(s: Session) {
    let res = await this.ipc.renameSession(s);
    await this.updateSessionStore();
    return res;
  }

  async updateSession(s: Session) {
    let res = await this.ipc.updateSession(s);
    await this.updateSessionStore();
    return res;
  }
}
