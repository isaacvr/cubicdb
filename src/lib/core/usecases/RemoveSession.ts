import type { ISessionRepository } from "../ports/ISessionRepository";
import type { Session } from "@interfaces";

export class RemoveSession {
  constructor(private repo: ISessionRepository) {}

  async execute(session: Session): Promise<Session> {
    return this.repo.removeSession(session);
  }
}
