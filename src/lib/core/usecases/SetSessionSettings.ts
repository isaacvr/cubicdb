import type { ISessionRepository } from "../ports/ISessionRepository";
import type { IEventDispatcher } from "../ports/IEventDispatcher";
import type { Session } from "@interfaces";
import { SessionSettingsChanged } from "@events/domain";

/**
 * Use case: Update session settings
 * Emits: SessionSettingsChanged event after persisting
 */
export class SetSessionSettings {
  constructor(
    private repo: ISessionRepository,
    private dispatcher?: IEventDispatcher
  ) {}

  async execute(session: Session, partial: Partial<Session["settings"]>): Promise<Session> {
    const s = { ...(session || ({} as any)) } as Session;
    s.settings = Object.assign({}, s.settings || {}, partial || {});
    const updated = await this.repo.updateSession(s);
    await this.dispatcher?.dispatch(new SessionSettingsChanged(updated));
    return updated;
  }
}
