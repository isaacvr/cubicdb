import { eventBus } from '../singleton';
import { SessionCreated, SessionUpdated, SessionDeleted, SessionSelected, SessionSettingsChanged } from '../domain';
import type { EventHandler } from '../types';
import { logger } from '@lib/logger';

/**
 * Setup all event handlers for Session domain events
 * Call this during app initialization
 */
export function setupSessionHandlers() {
  // Handler: When a session is created
  const onSessionCreated: EventHandler<SessionCreated> = async (event) => {
    logger.info('usecase', 'SessionCreated handler executing', { sessionName: event.session.name });
    // Example: Update sessions list, save to cache, etc
  };

  // Handler: When a session is updated
  const onSessionUpdated: EventHandler<SessionUpdated> = async (event) => {
    logger.debug('usecase', 'SessionUpdated handler executing', { sessionName: event.updatedSession.name });
    // Example: Refresh UI, invalidate cache, etc
  };

  // Handler: When a session is deleted
  const onSessionDeleted: EventHandler<SessionDeleted> = async (event) => {
    logger.info('usecase', 'SessionDeleted handler executing', { sessionName: event.session.name });
    // Example: Update sessions list, redirect if needed, etc
  };

  // Handler: When a session is selected
  const onSessionSelected: EventHandler<SessionSelected> = async (event) => {
    logger.debug('usecase', 'SessionSelected handler executing', { sessionName: event.session?.name });
    // Example: Load session data, update UI context, etc
  };

  // Handler: When session settings change
  const onSessionSettingsChanged: EventHandler<SessionSettingsChanged> = async (event) => {
    logger.debug('usecase', 'SessionSettingsChanged handler executing', { sessionName: event.session.name });
    // Example: Reload timer UI, update preferences, etc
  };

  // Subscribe handlers
  eventBus.subscribe(SessionCreated, onSessionCreated);
  eventBus.subscribe(SessionUpdated, onSessionUpdated);
  eventBus.subscribe(SessionDeleted, onSessionDeleted);
  eventBus.subscribe(SessionSelected, onSessionSelected);
  eventBus.subscribe(SessionSettingsChanged, onSessionSettingsChanged);
}
