import type { ISessionRepository } from "../ports/ISessionRepository";
import type { Session } from "@interfaces";

export class GetSessions {
  constructor(private repo: ISessionRepository) {}

  async execute(): Promise<Session[]> {
    return this.repo.getSessions();
  }
}
