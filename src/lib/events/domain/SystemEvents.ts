import type { DomainEvent } from '../types';

/**
 * Emitted when system is loading data (useful for progress indicators)
 */
export class DataLoadingStarted implements DomainEvent {
  readonly type = 'DataLoadingStarted';
  readonly timestamp = Date.now();
  readonly aggregate = 'System';

  constructor(public readonly entityType: string) {}
}

/**
 * Emitted when data loading completes
 */
export class DataLoadingCompleted implements DomainEvent {
  readonly type = 'DataLoadingCompleted';
  readonly timestamp = Date.now();
  readonly aggregate = 'System';

  constructor(public readonly entityType: string) {}
}

/**
 * Emitted when data loading fails
 */
export class DataLoadingFailed implements DomainEvent {
  readonly type = 'DataLoadingFailed';
  readonly timestamp = Date.now();
  readonly aggregate = 'System';

  constructor(
    public readonly entityType: string,
    public readonly error: Error
  ) {}
}

/**
 * Emitted when Bluetooth device connects/disconnects
 */
export class BluetoothStatusChanged implements DomainEvent {
  readonly type = 'BluetoothStatusChanged';
  readonly timestamp = Date.now();
  readonly aggregate = 'Bluetooth';

  constructor(
    public readonly connected: boolean,
    public readonly deviceName?: string
  ) {}
}

/**
 * Emitted when external timer data is received
 */
export class ExternalTimerDataReceived implements DomainEvent {
  readonly type = 'ExternalTimerDataReceived';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly data: any) {}
}

/**
 * Emitted when app is about to update
 */
export class UpdateAvailable implements DomainEvent {
  readonly type = 'UpdateAvailable';
  readonly timestamp = Date.now();
  readonly aggregate = 'System';

  constructor(public readonly version: string) {}
}

/**
 * Emitted when update is downloaded
 */
export class UpdateDownloaded implements DomainEvent {
  readonly type = 'UpdateDownloaded';
  readonly timestamp = Date.now();
  readonly aggregate = 'System';

  constructor(public readonly version: string) {}
}

/**
 * Emitted when download progress changes
 */
export class DownloadProgress implements DomainEvent {
  readonly type = 'DownloadProgress';
  readonly timestamp = Date.now();
  readonly aggregate = 'System';

  constructor(
    public readonly entityType: string,
    public readonly progress: number // 0-100
  ) {}
}
