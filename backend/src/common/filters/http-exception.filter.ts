import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ExceptionResponseBody {
  error?: string;
  message?: string | string[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const body = this.normalizeExceptionResponse(exceptionResponse, status);
    const path = request.originalUrl || request.url;
    const logMessage = `${request.method} ${path} -> ${status}`;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(logMessage, stack);
    } else {
      this.logger.warn(logMessage);
    }

    response.status(status).json({
      statusCode: status,
      error: body.error,
      message: body.message,
      path,
      timestamp: new Date().toISOString(),
    });
  }

  private normalizeExceptionResponse(
    response: string | object | undefined,
    status: number,
  ): Required<ExceptionResponseBody> {
    if (typeof response === 'string') {
      return {
        error: this.defaultError(status),
        message: response,
      };
    }

    if (response && typeof response === 'object') {
      const body = response as ExceptionResponseBody;
      return {
        error: body.error ?? this.defaultError(status),
        message: body.message ?? 'A requisição não pôde ser processada.',
      };
    }

    return {
      error: this.defaultError(status),
      message:
        status === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Ocorreu um erro interno no servidor.'
          : 'A requisição não pôde ser processada.',
    };
  }

  private defaultError(status: number): string {
    return HttpStatus[status] ?? 'Error';
  }
}
