import { eventBus } from '../singleton';
import {
  DataLoadingStarted,
  DataLoadingCompleted,
  DataLoadingFailed,
  BluetoothStatusChanged,
  ExternalTimerDataReceived,
  UpdateAvailable,
  UpdateDownloaded,
  DownloadProgress
} from '../domain';
import type { EventHandler } from '../types';
import { logger } from '@lib/logger';

/**
 * Setup all event handlers for System domain events
 * Call this during app initialization
 */
export function setupSystemHandlers() {
  // Handler: Data loading starts
  const onDataLoadingStarted: EventHandler<DataLoadingStarted> = async (event) => {
    logger.info('system', 'DataLoadingStarted', { entityType: event.entityType });
    // Example: Show loading indicator, disable UI
  };

  // Handler: Data loading completes
  const onDataLoadingCompleted: EventHandler<DataLoadingCompleted> = async (event) => {
    logger.info('system', 'DataLoadingCompleted', { entityType: event.entityType });
    // Example: Hide loading, refresh UI
  };

  // Handler: Data loading fails
  const onDataLoadingFailed: EventHandler<DataLoadingFailed> = async (event) => {
    logger.error('system', 'DataLoadingFailed', { entityType: event.entityType }, event.error);
    // Example: Show error notification, retry logic
  };

  // Handler: Bluetooth status changes
  const onBluetoothStatusChanged: EventHandler<BluetoothStatusChanged> = async (event) => {
    logger.info('system', 'BluetoothStatusChanged', { connected: event.connected, deviceName: event.deviceName });
    // Example: Update device status indicator, trigger connection/disconnect logic
  };

  // Handler: External timer data received
  const onExternalTimerDataReceived: EventHandler<ExternalTimerDataReceived> = async (event) => {
    logger.debug('system', 'ExternalTimerDataReceived', event.data);
    // Example: Process timer input, update timer UI
  };

  // Handler: Update available
  const onUpdateAvailable: EventHandler<UpdateAvailable> = async (event) => {
    logger.info('system', 'UpdateAvailable', { version: event.version });
    // Example: Notify user about update
  };

  // Handler: Update downloaded
  const onUpdateDownloaded: EventHandler<UpdateDownloaded> = async (event) => {
    logger.info('system', 'UpdateDownloaded', { version: event.version });
    // Example: Prompt user to restart, show "ready to install" message
  };

  // Handler: Download progress
  const onDownloadProgress: EventHandler<DownloadProgress> = async (event) => {
    logger.debug('system', 'DownloadProgress', { entityType: event.entityType, progress: event.progress });
    // Example: Update progress bar
  };

  // Subscribe handlers
  eventBus.subscribe(DataLoadingStarted, onDataLoadingStarted);
  eventBus.subscribe(DataLoadingCompleted, onDataLoadingCompleted);
  eventBus.subscribe(DataLoadingFailed, onDataLoadingFailed);
  eventBus.subscribe(BluetoothStatusChanged, onBluetoothStatusChanged);
  eventBus.subscribe(ExternalTimerDataReceived, onExternalTimerDataReceived);
  eventBus.subscribe(UpdateAvailable, onUpdateAvailable);
  eventBus.subscribe(UpdateDownloaded, onUpdateDownloaded);
  eventBus.subscribe(DownloadProgress, onDownloadProgress);
}
