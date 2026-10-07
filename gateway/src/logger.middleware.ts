import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');
  use(request: Request, response: Response, next: NextFunction): void {
    const start = Date.now();
    response.on('finish', () => {
      this.logger.log(`${request.method} ${request.originalUrl} ${response.statusCode} ${Date.now() - start}ms`);
    });
    next();
  }
}
