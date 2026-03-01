// Logging system types and interfaces
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'off';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  stackTrace?: string;
}

export interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  categories: {
    [key: string]: LogLevel | boolean;
  };
  storage: {
    enabled: boolean;
    maxEntries: number;
  };
  console: {
    enabled: boolean;
    colors: boolean;
  };
}

export interface ILogger {
  debug(category: string, message: string, data?: any): void;
  info(category: string, message: string, data?: any): void;
  warn(category: string, message: string, data?: any): void;
  error(category: string, message: string, data?: any, error?: Error): void;
  
  // Configuration
  setConfig(config: Partial<LoggerConfig>): void;
  getConfig(): LoggerConfig;
  setCategoryLevel(category: string, level: LogLevel | boolean): void;
  
  // Storage & retrieval
  getLogs(): LogEntry[];
  getLogsByCategory(category: string): LogEntry[];
  getLogsByLevel(level: LogLevel): LogEntry[];
  clearLogs(): void;
  exportLogs(format: 'json' | 'csv'): string;
  
  // Utilities
  isEnabled(category: string, level: LogLevel): boolean;
}
