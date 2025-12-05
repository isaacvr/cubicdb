import { writable, type Writable } from "svelte/store";
import { SessionRepositoryAdapter } from "../adapters/SessionRepositoryAdapter";
import { GetSessions } from "../core/usecases/GetSessions";
import { AddSession } from "../core/usecases/AddSession";
import { UpdateSession } from "../core/usecases/UpdateSession";
import { RemoveSession } from "../core/usecases/RemoveSession";
import { SetSessionSettings } from "../core/usecases/SetSessionSettings";
import type { Session } from "@interfaces";
type SessionSettingsPartial = Partial<Session["settings"]>;

export class SessionController {
  public sessions: Writable<Session[]> = writable([]);

  private getSessionsUsecase: GetSessions;
  private addSessionUsecase: AddSession;
  private updateSessionUsecase: UpdateSession;
  private removeSessionUsecase: RemoveSession;
  // convenience use-case for partial settings updates
  private setSessionSettingsUsecase: SetSessionSettings | null = null;

  constructor() {
    const repo = new SessionRepositoryAdapter();
    this.getSessionsUsecase = new GetSessions(repo);
    this.addSessionUsecase = new AddSession(repo);
    this.updateSessionUsecase = new UpdateSession(repo);
    this.removeSessionUsecase = new RemoveSession(repo);
    this.setSessionSettingsUsecase = new SetSessionSettings(repo);
  }

  async loadSessions() {
    const s = await this.getSessionsUsecase.execute();
    this.sessions.set(s);
    return s;
  }

  async addSession(session: Session) {
    const added = await this.addSessionUsecase.execute(session);
    this.sessions.update(curr => [added, ...curr]);
    return added;
  }

  async updateSession(session: Session) {
    const updated = await this.updateSessionUsecase.execute(session);
    this.sessions.update(curr => curr.map(s => (s._id === updated._id ? updated : s)));
    return updated;
  }

  async removeSession(session: Session) {
    const removed = await this.removeSessionUsecase.execute(session);
    this.sessions.update(curr => curr.filter(s => s._id !== removed._id));
    return removed;
  }

  async applySettings(session: Session, partialSettings: SessionSettingsPartial) {
    if (!this.setSessionSettingsUsecase) {
      throw new Error("SetSessionSettings usecase not initialized");
    }

    const updated = await this.setSessionSettingsUsecase.execute(session, partialSettings);
    this.sessions.update(curr => curr.map(s => (s._id === updated._id ? updated : s)));
    return updated;
  }
}

export const sessionController = new SessionController();
