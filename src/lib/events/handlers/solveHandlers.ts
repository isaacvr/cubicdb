import { eventBus } from '../singleton';
import { SolveAdded, SolveUpdated, SolvesRemoved, SolveSelected } from '../domain';
import type { EventHandler } from '../types';
import { logger } from '@lib/logger';

/**
 * Setup all event handlers for Solve domain events
 * Call this during app initialization
 */
export function setupSolveHandlers() {
  // Handler: When a solve is added, you could update UI, analytics, etc
  const onSolveAdded: EventHandler<SolveAdded> = async (event) => {
    logger.info('usecase', 'SolveAdded handler executing', { solveId: event.solve._id });
    // Example: Send to analytics, update cache, etc
  };

  // Handler: When a solve is updated
  const onSolveUpdated: EventHandler<SolveUpdated> = async (event) => {
    logger.debug('usecase', 'SolveUpdated handler executing', { solveId: event.updatedSolve._id });
    // Example: Invalidate cache, update UI, etc
  };

  // Handler: When solves are removed
  const onSolvesRemoved: EventHandler<SolvesRemoved> = async (event) => {
    logger.info('usecase', 'SolvesRemoved handler executing', { count: event.solves.length });
    // Example: Update statistics, refresh UI, etc
  };

  // Handler: When a solve is selected
  const onSolveSelected: EventHandler<SolveSelected> = async (event) => {
    logger.debug('usecase', 'SolveSelected handler executing', { solveId: event.solve?._id });
    // Example: Load solve details, update inspector, etc
  };

  // Subscribe handlers
  eventBus.subscribe(SolveAdded, onSolveAdded);
  eventBus.subscribe(SolveUpdated, onSolveUpdated);
  eventBus.subscribe(SolvesRemoved, onSolvesRemoved);
  eventBus.subscribe(SolveSelected, onSolveSelected);
}
