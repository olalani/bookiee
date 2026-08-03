import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let detail = '';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      message = typeof exResponse === 'string' ? exResponse : (exResponse as any).message || message;
    } else if (exception instanceof Error) {
      detail = exception.message;
      console.error('Unhandled error:', exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      message,
      detail: detail || undefined,
      timestamp: new Date().toISOString(),
    });
  }
}
