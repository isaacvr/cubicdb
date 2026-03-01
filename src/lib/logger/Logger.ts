import type { LogEntry, LoggerConfig, ILogger, LogLevel } from './types';
import { DEFAULT_LOGGER_CONFIG, LOG_LEVEL_HIERARCHY } from './config';

/**
 * Centralized logging system with levels, categories, and storage
 * Supports enabling/disabling per category and level
 */
export class Logger implements ILogger {
  private config: LoggerConfig = { ...DEFAULT_LOGGER_CONFIG };
  private logs: LogEntry[] = [];

  constructor(initialConfig?: Partial<LoggerConfig>) {
    if (initialConfig) {
      this.setConfig(initialConfig);
    }
  }

  /**
   * Log debug level message
   */
  debug(category: string, message: string, data?: any): void {
    this.log('debug', category, message, data);
  }

  /**
   * Log info level message
   */
  info(category: string, message: string, data?: any): void {
    this.log('info', category, message, data);
  }

  /**
   * Log warn level message
   */
  warn(category: string, message: string, data?: any): void {
    this.log('warn', category, message, data);
  }

  /**
   * Log error level message with optional error object
   */
  error(category: string, message: string, data?: any, error?: Error): void {
    this.log('error', category, message, data, error?.stack);
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, category: string, message: string, data?: any, stackTrace?: string): void {
    // Check if logging is enabled for this category and level
    if (!this.isEnabled(category, level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      stackTrace,
    };

    // Store log entry
    if (this.config.storage.enabled) {
      this.logs.push(entry);
      
      // Trim logs if exceeding max entries
      if (this.logs.length > this.config.storage.maxEntries) {
        this.logs.splice(0, this.logs.length - this.config.storage.maxEntries);
      }
    }

    // Output to console
    if (this.config.console.enabled) {
      this.logToConsole(entry);
    }
  }

  /**
   * Output log entry to console with formatting
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`;

    const colors = this.config.console.colors;
    const style = this.getConsoleStyle(entry.level);

    if (colors && typeof window !== 'undefined') {
      console.log(
        `%c${prefix}`,
        style,
        entry.message,
        entry.data ? entry.data : ''
      );
    } else {
      // Fallback for non-browser or colors disabled
      const output = `${prefix} ${entry.message}`;
      if (entry.data) {
        console.log(output, entry.data);
      } else {
        console.log(output);
      }
    }

    if (entry.stackTrace) {
      console.log('Stack Trace:', entry.stackTrace);
    }
  }

  /**
   * Get console styling based on log level
   */
  private getConsoleStyle(level: LogLevel): string {
    const styles: { [key in Exclude<LogLevel, 'off'>]: string } = {
      debug: 'color: #666; font-size: 12px;',
      info: 'color: #0066cc; font-weight: bold;',
      warn: 'color: #ff9900; font-weight: bold;',
      error: 'color: #cc0000; font-weight: bold;',
    };
    return styles[level as Exclude<LogLevel, 'off'>] || '';
  }

  /**
   * Check if logging is enabled for category and level
   */
  isEnabled(category: string, level: LogLevel): boolean {
    if (!this.config.enabled || this.config.level === 'off') {
      return false;
    }

    // Check category-specific level
    const categoryLevel = this.config.categories[category];
    if (categoryLevel !== undefined) {
      const categoryLevelValue = typeof categoryLevel === 'string' ? categoryLevel : (categoryLevel ? 'debug' : 'off');
      if (categoryLevelValue === 'off') return false;
      return LOG_LEVEL_HIERARCHY[level] >= LOG_LEVEL_HIERARCHY[categoryLevelValue];
    }

    // Fall back to global level
    return LOG_LEVEL_HIERARCHY[level] >= LOG_LEVEL_HIERARCHY[this.config.level];
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<LoggerConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      categories: {
        ...this.config.categories,
        ...config.categories,
      },
      storage: {
        ...this.config.storage,
        ...config.storage,
      },
      console: {
        ...this.config.console,
        ...config.console,
      },
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Set log level for a specific category
   */
  setCategoryLevel(category: string, level: LogLevel | boolean): void {
    if (typeof level === 'boolean') {
      this.config.categories[category] = level ? 'debug' : 'off';
    } else {
      this.config.categories[category] = level;
    }
  }

  /**
   * Get all stored logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by category
   */
  getLogsByCategory(category: string): LogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Clear all stored logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs in specified format
   */
  exportLogs(format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    }

    if (format === 'csv') {
      const headers = ['timestamp', 'level', 'category', 'message', 'data'];
      const rows = [headers.join(',')];

      for (const log of this.logs) {
        const timestamp = new Date(log.timestamp).toISOString();
        const row = [
          timestamp,
          log.level,
          log.category,
          `"${log.message.replace(/"/g, '""')}"`,
          log.data ? `"${JSON.stringify(log.data).replace(/"/g, '""')}"` : '',
        ];
        rows.push(row.join(','));
      }

      return rows.join('\n');
    }

    return '';
  }
}
