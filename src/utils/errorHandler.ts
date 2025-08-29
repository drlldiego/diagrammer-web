/**
 * Sistema centralizado de tratamento de erros
 */

import { logger } from './logger';
import { notifications, NotificationType } from './notifications';

export enum ErrorType {
  BPMN_IMPORT = 'BPMN_IMPORT',
  BPMN_EXPORT = 'BPMN_EXPORT',
  BPMN_SETUP = 'BPMN_SETUP',
  PDF_EXPORT = 'PDF_EXPORT',
  PNG_EXPORT = 'PNG_EXPORT',
  MINIMAP_CONTROL = 'MINIMAP_CONTROL',
  FILE_OPERATION = 'FILE_OPERATION',
  CANVAS_OPERATION = 'CANVAS_OPERATION',
  // ER-specific error types
  ER_IMPORT = 'ER_IMPORT',
  ER_EXPORT = 'ER_EXPORT',
  ER_SETUP = 'ER_SETUP',
  ER_PDF_EXPORT = 'ER_PDF_EXPORT',
  ER_PNG_EXPORT = 'ER_PNG_EXPORT',
  ER_CANVAS_OPERATION = 'ER_CANVAS_OPERATION'
}

interface ErrorContext {
  type: ErrorType;
  operation: string;
  userMessage?: string;
  fallback?: () => void;
  showNotification?: boolean;
}

export class DiagrammerError extends Error {
  public type: ErrorType;
  public operation: string;
  public userMessage: string;
  public fallback?: () => void;

  constructor(context: ErrorContext, originalError?: Error) {
    super(originalError?.message || context.operation);
    this.name = 'DiagrammerError';
    this.type = context.type;
    this.operation = context.operation;
    this.userMessage = context.userMessage || this.getDefaultUserMessage(context.type);
    this.fallback = context.fallback;

    // Preservar stack trace original se disponível
    if (originalError && originalError.stack) {
      this.stack = originalError.stack;
    }
  }

  private getDefaultUserMessage(type: ErrorType): string {
    const messages = {
      [ErrorType.BPMN_IMPORT]: 'Erro ao importar diagrama. Verifique se o arquivo é um BPMN válido.',
      [ErrorType.BPMN_EXPORT]: 'Erro ao exportar diagrama. Tente novamente.',
      [ErrorType.BPMN_SETUP]: 'Erro ao inicializar editor. Recarregue a página.',
      [ErrorType.PDF_EXPORT]: 'Erro ao exportar PDF. Tente novamente ou use outro formato.',
      [ErrorType.PNG_EXPORT]: 'Erro ao exportar PNG. Tente novamente ou use outro formato.',
      [ErrorType.MINIMAP_CONTROL]: 'Erro no controle do minimap. Funcionalidade pode estar limitada.',
      [ErrorType.FILE_OPERATION]: 'Erro na operação de arquivo. Verifique as permissões.',
      [ErrorType.CANVAS_OPERATION]: 'Erro na operação do canvas. Tente novamente.',
      // ER-specific messages
      [ErrorType.ER_IMPORT]: 'Erro ao importar diagrama ER. Verifique se o arquivo é válido.',
      [ErrorType.ER_EXPORT]: 'Erro ao exportar diagrama ER. Tente novamente.',
      [ErrorType.ER_SETUP]: 'Erro ao inicializar editor ER. Recarregue a página.',
      [ErrorType.ER_PDF_EXPORT]: 'Erro ao exportar PDF ER. Tente outro formato.',
      [ErrorType.ER_PNG_EXPORT]: 'Erro ao exportar PNG ER. Tente outro formato.',
      [ErrorType.ER_CANVAS_OPERATION]: 'Erro na operação do canvas ER. Tente novamente.'
    };
    return messages[type] || 'Erro inesperado. Tente novamente.';
  }
}

export class ErrorHandler {
  static handle(context: ErrorContext, originalError?: Error): void {
    const error = new DiagrammerError(context, originalError);
    
    // Log do erro
    logger.error(
      `${error.type}: ${error.operation}`,
      error.operation,
      originalError || error
    );

    // Mostrar notificação user-friendly se solicitado
    if (context.showNotification !== false) {
      notifications.error(error.userMessage);
    }

    // Executar fallback se disponível
    if (error.fallback) {
      try {
        error.fallback();
        logger.info(`Fallback executado com sucesso para: ${error.operation}`, error.operation);
      } catch (fallbackError) {
        logger.error(
          `Falha no fallback para: ${error.operation}`,
          error.operation,
          fallbackError as Error
        );
      }
    }
  }

  static handleAsync<T>(
    operation: () => Promise<T>,
    context: ErrorContext
  ): Promise<T | null> {
    return operation().catch((error) => {
      this.handle(context, error);
      return null;
    });
  }

  static handleSync<T>(
    operation: () => T,
    context: ErrorContext
  ): T | null {
    try {
      return operation();
    } catch (error) {
      this.handle(context, error as Error);
      return null;
    }
  }

  static createSafeOperation<T>(
    operation: () => T,
    context: ErrorContext
  ): () => T | null {
    return () => this.handleSync(operation, context);
  }

  static createSafeAsyncOperation<T>(
    operation: () => Promise<T>,
    context: ErrorContext
  ): () => Promise<T | null> {
    return () => this.handleAsync(operation, context);
  }
}

// Utilitários para operações comuns
export const safeOperation = <T>(
  operation: () => T,
  context: ErrorContext
): T | null => {
  return ErrorHandler.handleSync(operation, context);
};

export const safeAsyncOperation = <T>(
  operation: () => Promise<T>,
  context: ErrorContext
): Promise<T | null> => {
  return ErrorHandler.handleAsync(operation, context);
};