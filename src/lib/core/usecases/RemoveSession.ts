import type { ISessionRepository } from "../ports/ISessionRepository";
import type { IEventDispatcher } from "../ports/IEventDispatcher";
import type { Session } from "@interfaces";
import { SessionDeleted } from "@events/domain";

/**
 * Use case: Delete a session
 * Emits: SessionDeleted event after persisting
 */
export class RemoveSession {
  constructor(
    private repo: ISessionRepository,
    private dispatcher: IEventDispatcher
  ) {}

  async execute(session: Session): Promise<Session> {
    const removed = await this.repo.removeSession(session);
    await this.dispatcher.dispatch(new SessionDeleted(removed));
    return removed;
  }
}
