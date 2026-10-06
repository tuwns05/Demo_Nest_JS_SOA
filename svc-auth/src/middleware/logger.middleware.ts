import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggerMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    res.once('finish', () => {
      this.logger.log(
        `${req.method} ${req.originalUrl} ${res.statusCode}`,
      );
    });
    next();
  }
}
