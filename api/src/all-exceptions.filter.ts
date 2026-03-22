import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

const USER_FRIENDLY_MESSAGES: Record<number, string> = {
  400: '입력 형식이 잘못되었습니다',
  401: '로그인이 필요합니다',
  403: '권한이 없습니다',
  404: '요청하신 항목을 찾을 수 없습니다',
  409: '이미 처리된 요청입니다',
  413: '파일이 너무 큽니다',
  429: '요청이 많아요. 잠시 후 다시 시도해주세요',
  500: '서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요',
  502: '서버 연결에 문제가 있습니다',
  503: '서비스 점검 중입니다. 잠시 후 다시 시도해주세요',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let responseBody: any;

    if (exception instanceof HttpException) {
      const exRes = exception.getResponse();
      // HttpException의 원래 메시지가 한글이면 그대로 사용 (직접 던진 에러)
      const originalMsg = typeof exRes === 'string' ? exRes : (exRes as any)?.message;
      const isKorean = typeof originalMsg === 'string' && /[가-힣]/.test(originalMsg);
      responseBody = {
        statusCode: status,
        message: isKorean ? originalMsg : (USER_FRIENDLY_MESSAGES[status] || '오류가 발생했습니다'),
      };
    } else {
      responseBody = {
        statusCode: status,
        message: USER_FRIENDLY_MESSAGES[status] || '서버에 일시적인 문제가 발생했습니다',
      };
    }

    if (status >= 500) {
      this.logger.error(`[${status}] ${exception instanceof Error ? exception.message : 'Unknown error'}`, exception instanceof Error ? exception.stack : undefined);
    }

    response.status(status).json(responseBody);
  }
}
