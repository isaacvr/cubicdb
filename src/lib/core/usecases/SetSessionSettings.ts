import type { ISessionRepository } from "../ports/ISessionRepository";
import type { Session } from "@interfaces";

export class SetSessionSettings {
  constructor(private repo: ISessionRepository) {}

  async execute(session: Session, partial: Partial<Session["settings"]>): Promise<Session> {
    const s = { ...(session || ({} as any)) } as Session;
    s.settings = Object.assign({}, s.settings || {}, partial || {});
    return this.repo.updateSession(s);
  }
}
