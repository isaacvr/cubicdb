import type { ISessionRepository } from "../ports/ISessionRepository";
import type { IEventDispatcher } from "../ports/IEventDispatcher";
import type { Session } from "@interfaces";
import { SessionDefaultSettings } from "@constants";
import { SessionUpdated } from "@events/domain";

/**
 * Use case: Update an existing session
 * Normalizes input and emits SessionUpdated event
 */
export class UpdateSession {
  constructor(
    private repo: ISessionRepository,
    private dispatcher: IEventDispatcher
  ) {}

  /**
   * Apply normalization rules before updating.
   */
  async execute(previousSession: Session, sessionData: Session): Promise<Session> {
    const normalized: Session = { ...(sessionData || ({} as any)) } as Session;

    normalized.name = (normalized.name || "").trim();
    if (!normalized.name) {
      throw new Error("Session name cannot be empty");
    }

    normalized.settings = Object.assign({}, SessionDefaultSettings, normalized.settings || {});

    if (normalized.settings.sessionType === "multi-step") {
      normalized.settings.steps = normalized.settings.steps || 2;
      normalized.settings.stepNames = normalized.settings.stepNames || ["", ""];
    }

    const updated = await this.repo.updateSession(normalized);
    await this.dispatcher.dispatch(new SessionUpdated(previousSession, updated));
    return updated;
  }
}
