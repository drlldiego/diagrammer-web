/**
 * Sistema de logging centralizado para o Diagrammer Web
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  error?: Error;
}

class Logger {
  private logLevel: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogs: number = 100;

  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  private createLogEntry(level: LogLevel, message: string, context?: string, error?: Error): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error
    };
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  debug(message: string, context?: string) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
      this.addLog(entry);
      console.debug(`[DEBUG] ${context ? `[${context}] ` : ''}${message}`);
    }
  }

  info(message: string, context?: string) {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = this.createLogEntry(LogLevel.INFO, message, context);
      this.addLog(entry);
      console.info(`[INFO] ${context ? `[${context}] ` : ''}${message}`);
    }
  }

  warn(message: string, context?: string, error?: Error) {
    if (this.shouldLog(LogLevel.WARN)) {
      const entry = this.createLogEntry(LogLevel.WARN, message, context, error);
      this.addLog(entry);      
    }
  }

  error(message: string, context?: string, error?: Error) {
    if (this.shouldLog(LogLevel.ERROR)) {
      const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
      this.addLog(entry);
      console.error(`[ERROR] ${context ? `[${context}] ` : ''}${message}`, error || '');
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  // Método para download dos logs (útil para debug)
  downloadLogs() {
    const logsText = this.logs.map(log => 
      `${log.timestamp} [${LogLevel[log.level]}] ${log.context ? `[${log.context}] ` : ''}${log.message}${log.error ? ` - ${log.error.message}` : ''}`
    ).join('\n');
    
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagrammer-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Instância singleton do logger
export const logger = new Logger();

// Em desenvolvimento, podemos usar nível DEBUG
if (process.env.NODE_ENV === 'development') {
  logger.setLogLevel(LogLevel.DEBUG);
}