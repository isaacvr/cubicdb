import { Logger } from './Logger';

// Global singleton logger instance
const logger = new Logger({
  enabled: true,
  level: 'info',
  console: {
    enabled: true,
    colors: true,
  },
  storage: {
    enabled: true,
    maxEntries: 1000,
  },
});

export { logger };
