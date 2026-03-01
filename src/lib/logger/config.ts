// Default logger configuration
import type { LoggerConfig } from './types';

export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  enabled: true,
  level: 'info', // Default level: info, warn, error
  categories: {
    'event': 'info',
    'usecase': 'debug',
    'repository': 'debug',
    'adapter': 'info',
    'component': 'info',
    'system': 'info',
  },
  storage: {
    enabled: true,
    maxEntries: 1000,
  },
  console: {
    enabled: true,
    colors: true, // Use console colors if available
  },
};

// Level hierarchy for filtering
export const LOG_LEVEL_HIERARCHY: { [key: string]: number } = {
  'debug': 0,
  'info': 1,
  'warn': 2,
  'error': 3,
  'off': 999,
};
