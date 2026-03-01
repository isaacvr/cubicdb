import type { ISessionRepository } from "../ports/ISessionRepository";
import type { IEventDispatcher } from "../ports/IEventDispatcher";
import type { Session } from "@interfaces";
import { SessionDefaultSettings } from "@constants";
import { SessionCreated } from "@events/domain";

/**
 * Use case: Create a new session
 * Normalizes input and emits SessionCreated event
 */
export class AddSession {
  constructor(
    private repo: ISessionRepository,
    private dispatcher: IEventDispatcher
  ) {}

  /**
   * Normalize and validate session before persisting.
   * - Trim name
   * - Apply default settings
   * - Ensure multi-step fields exist
   */
  async execute(session: Session): Promise<Session> {
    const normalized: Session = { ...(session || ({} as any)) } as Session;

    normalized.name = (normalized.name || "").trim();
    if (!normalized.name) {
      throw new Error("Session name cannot be empty");
    }

    normalized.settings = Object.assign({}, SessionDefaultSettings, normalized.settings || {});

    if (normalized.settings.sessionType === "multi-step") {
      normalized.settings.steps = normalized.settings.steps || 2;
      normalized.settings.stepNames = normalized.settings.stepNames || ["", ""];
    }

    normalized.tName = normalized.name;

    const added = await this.repo.addSession(normalized);
    await this.dispatcher.dispatch(new SessionCreated(added));
    return added;
  }
}
