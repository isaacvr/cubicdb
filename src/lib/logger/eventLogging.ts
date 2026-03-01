import { eventBus } from '../events/singleton';
import { logger } from './singleton';
import {
  SolveAdded, SolveUpdated, SolvesRemoved, SolveSelected,
  SessionCreated, SessionUpdated, SessionDeleted, SessionSelected, SessionSettingsChanged,
  AlgorithmAdded, AlgorithmUpdated, AlgorithmRemoved, AlgorithmsRemoved,
  ReconstructionAdded, ReconstructionUpdated, ReconstructionRemoved, ReconstructionsRemoved,
  DataLoadingStarted, DataLoadingCompleted, DataLoadingFailed,
  BluetoothStatusChanged, ExternalTimerDataReceived,
  UpdateAvailable, UpdateDownloaded, DownloadProgress,
} from '../events/domain';

/**
 * Automatically log all domain events
 * Call this during app initialization
 */
export function setupEventLogging() {
  // Solve events
  eventBus.subscribe(SolveAdded, (e) => {
    logger.info('event', 'SolveAdded', { solveId: e.solve._id, time: e.solve.time });
  });

  eventBus.subscribe(SolveUpdated, (e) => {
    logger.debug('event', 'SolveUpdated', {
      solveId: e.updatedSolve._id,
      oldTime: e.previousSolve.time,
      newTime: e.updatedSolve.time,
    });
  });

  eventBus.subscribe(SolvesRemoved, (e) => {
    logger.info('event', 'SolvesRemoved', { count: e.solves.length });
  });

  eventBus.subscribe(SolveSelected, (e) => {
    logger.debug('event', 'SolveSelected', { solveId: e.solve?._id });
  });

  // Session events
  eventBus.subscribe(SessionCreated, (e) => {
    logger.info('event', 'SessionCreated', { sessionName: e.session.name });
  });

  eventBus.subscribe(SessionUpdated, (e) => {
    logger.debug('event', 'SessionUpdated', { sessionName: e.updatedSession.name });
  });

  eventBus.subscribe(SessionDeleted, (e) => {
    logger.info('event', 'SessionDeleted', { sessionName: e.session.name });
  });

  eventBus.subscribe(SessionSelected, (e) => {
    logger.debug('event', 'SessionSelected', { sessionName: e.session?.name });
  });

  eventBus.subscribe(SessionSettingsChanged, (e) => {
    logger.debug('event', 'SessionSettingsChanged', { sessionName: e.session.name });
  });

  // Algorithm events
  eventBus.subscribe(AlgorithmAdded, (e) => {
    logger.info('event', 'AlgorithmAdded', { alg: e.algorithm.shortName });
  });

  eventBus.subscribe(AlgorithmUpdated, (e) => {
    logger.debug('event', 'AlgorithmUpdated', { alg: e.updatedAlgorithm.shortName });
  });

  eventBus.subscribe(AlgorithmRemoved, (e) => {
    logger.info('event', 'AlgorithmRemoved', { alg: e.algorithm.shortName });
  });

  eventBus.subscribe(AlgorithmsRemoved, (e) => {
    logger.info('event', 'AlgorithmsRemoved', { count: e.algorithms.length });
  });

  // Reconstruction events
  eventBus.subscribe(ReconstructionAdded, (e) => {
    logger.info('event', 'ReconstructionAdded', { id: e.reconstruction._id, title: e.reconstruction.title });
  });

  eventBus.subscribe(ReconstructionUpdated, (e) => {
    logger.debug('event', 'ReconstructionUpdated', { id: e.updatedReconstruction._id, title: e.updatedReconstruction.title });
  });

  eventBus.subscribe(ReconstructionRemoved, (e) => {
    logger.info('event', 'ReconstructionRemoved', { id: e.reconstruction._id, title: e.reconstruction.title });
  });

  eventBus.subscribe(ReconstructionsRemoved, (e) => {
    logger.info('event', 'ReconstructionsRemoved', { count: e.reconstructions.length });
  });

  // System events
  eventBus.subscribe(DataLoadingStarted, (e) => {
    logger.info('event', 'DataLoadingStarted', { entityType: e.entityType });
  });

  eventBus.subscribe(DataLoadingCompleted, (e) => {
    logger.info('event', 'DataLoadingCompleted', { entityType: e.entityType });
  });

  eventBus.subscribe(DataLoadingFailed, (e) => {
    logger.error('event', 'DataLoadingFailed', { entityType: e.entityType }, e.error);
  });

  eventBus.subscribe(BluetoothStatusChanged, (e) => {
    logger.info('event', 'BluetoothStatusChanged', {
      connected: e.connected,
      deviceName: e.deviceName,
    });
  });

  eventBus.subscribe(ExternalTimerDataReceived, (e) => {
    logger.debug('event', 'ExternalTimerDataReceived', { data: e.data });
  });

  eventBus.subscribe(UpdateAvailable, (e) => {
    logger.info('event', 'UpdateAvailable', { version: e.version });
  });

  eventBus.subscribe(UpdateDownloaded, (e) => {
    logger.info('event', 'UpdateDownloaded', { version: e.version });
  });

  eventBus.subscribe(DownloadProgress, (e) => {
    logger.debug('event', 'DownloadProgress', {
      entityType: e.entityType,
      progress: e.progress,
    });
  });
}
