import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : { statusCode: status, message: '서버 내부 오류가 발생했습니다' };

    if (status >= 500) {
      this.logger.error(`[${status}] ${exception instanceof Error ? exception.message : 'Unknown error'}`, exception instanceof Error ? exception.stack : undefined);
    }

    response.status(status).json(typeof message === 'string' ? { statusCode: status, message } : message);
  }
}
