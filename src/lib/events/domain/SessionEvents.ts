import type { DomainEvent } from '../types';
import type { Session } from '@interfaces';

/**
 * Emitted when a session is created
 */
export class SessionCreated implements DomainEvent {
  readonly type = 'SessionCreated';
  readonly timestamp = Date.now();
  readonly aggregate = 'Session';

  constructor(public readonly session: Session) {}
}

/**
 * Emitted when a session is updated
 */
export class SessionUpdated implements DomainEvent {
  readonly type = 'SessionUpdated';
  readonly timestamp = Date.now();
  readonly aggregate = 'Session';

  constructor(
    public readonly previousSession: Session,
    public readonly updatedSession: Session
  ) {}
}

/**
 * Emitted when a session is deleted
 */
export class SessionDeleted implements DomainEvent {
  readonly type = 'SessionDeleted';
  readonly timestamp = Date.now();
  readonly aggregate = 'Session';

  constructor(public readonly session: Session) {}
}

/**
 * Emitted when a session is selected/activated
 */
export class SessionSelected implements DomainEvent {
  readonly type = 'SessionSelected';
  readonly timestamp = Date.now();
  readonly aggregate = 'Session';

  constructor(public readonly session: Session | null) {}
}

/**
 * Emitted when session settings are changed
 */
export class SessionSettingsChanged implements DomainEvent {
  readonly type = 'SessionSettingsChanged';
  readonly timestamp = Date.now();
  readonly aggregate = 'Session';

  constructor(public readonly session: Session) {}
}
