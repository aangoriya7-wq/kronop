// ==================== SILENT LOGGER ====================
// Utility for silent error logging with clear terminal formatting
// No mobile alerts, only console logs for debugging

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN', 
  INFO = 'INFO',
  SUCCESS = 'SUCCESS'
}

export interface LogContext {
  module: string;
  action: string;
  userId?: string;
}

/**
 * Silent Logger - Logs errors to console only
 * Format: [MODULE_ACTION]: message
 */
export class SilentLogger {
  private static formatMessage(context: LogContext, message: string, level: LogLevel): string {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
    const prefix = `[${context.module.toUpperCase()}_${context.action.toUpperCase()}]`;
    return `${timestamp} ${prefix}: ${message}`;
  }

  static error(context: LogContext, message: string, error?: any): void {
    const formattedMessage = this.formatMessage(context, message, LogLevel.ERROR);
    console.error(`🔴 ${formattedMessage}`);
    if (error) {
      console.error('🔴 Error details:', error);
    }
  }

  static warn(context: LogContext, message: string): void {
    const formattedMessage = this.formatMessage(context, message, LogLevel.WARN);
    console.warn(`🟡 ${formattedMessage}`);
  }

  static info(context: LogContext, message: string): void {
    const formattedMessage = this.formatMessage(context, message, LogLevel.INFO);
    console.log(`🔵 ${formattedMessage}`);
  }

  static success(context: LogContext, message: string): void {
    const formattedMessage = this.formatMessage(context, message, LogLevel.SUCCESS);
    console.log(`🟢 ${formattedMessage}`);
  }

  static network(context: LogContext, url: string, status: number, message?: string): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    const logMessage = message || `HTTP ${status}`;
    const formattedMessage = this.formatMessage(context, `${logMessage} - ${url}`, level);
    
    if (status >= 400) {
      console.error(`🔴 ${formattedMessage}`);
    } else {
      console.log(`🔵 ${formattedMessage}`);
    }
  }

  static api(context: LogContext, endpoint: string, method: string, status: number, error?: string): void {
    const message = `${method} ${endpoint} - ${status}`;
    if (error) {
      this.error(context, `${message} - ${error}`);
    } else if (status >= 400) {
      this.error(context, message);
    } else {
      this.success(context, message);
    }
  }

  static upload(context: LogContext, fileName: string, status: string, details?: string): void {
    const message = `${fileName} - ${status}`;
    if (details) {
      this.info(context, `${message} - ${details}`);
    } else {
      this.info(context, message);
    }
  }

  static auth(context: LogContext, action: string, success: boolean, details?: string): void {
    const message = `${action} - ${success ? 'SUCCESS' : 'FAILED'}`;
    if (details) {
      if (success) {
        this.success(context, `${message} - ${details}`);
      } else {
        this.error(context, `${message} - ${details}`);
      }
    } else {
      if (success) {
        this.success(context, message);
      } else {
        this.error(context, message);
      }
    }
  }
}

// Predefined contexts for common operations
export const LogContexts = {
  REELS: { module: 'REELS', action: 'UPLOAD' },
  VIDEOS: { module: 'VIDEOS', action: 'UPLOAD' },
  PHOTOS: { module: 'PHOTOS', action: 'UPLOAD' },
  STORIES: { module: 'STORIES', action: 'UPLOAD' },
  SHAYARI: { module: 'SHAYARI', action: 'UPLOAD' },
  AUTH: { module: 'AUTH', action: 'LOGIN' },
  API: { module: 'API', action: 'CALL' },
  NETWORK: { module: 'NETWORK', action: 'REQUEST' },
  SYNC: { module: 'SYNC', action: 'AUTO' },
  VALIDATION: { module: 'VALIDATION', action: 'FORM' }
};

// Quick access functions
export const logError = (context: LogContext, message: string, error?: any) => 
  SilentLogger.error(context, message, error);

export const logSuccess = (context: LogContext, message: string) => 
  SilentLogger.success(context, message);

export const logNetwork = (context: LogContext, url: string, status: number, message?: string) => 
  SilentLogger.network(context, url, status, message);

export const logApi = (context: LogContext, endpoint: string, method: string, status: number, error?: string) => 
  SilentLogger.api(context, endpoint, method, status, error);

export const logUpload = (context: LogContext, fileName: string, status: string, details?: string) => 
  SilentLogger.upload(context, fileName, status, details);

export const logAuth = (context: LogContext, action: string, success: boolean, details?: string) => 
  SilentLogger.auth(context, action, success, details);
