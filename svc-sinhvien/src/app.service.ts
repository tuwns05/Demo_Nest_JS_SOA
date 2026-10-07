import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@soa/database';

@Injectable()
export class AppService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getHealth(): Promise<{ status: string; service: string; message?: string }> {
    try {
      await this.databaseService.query('SELECT 1 AS result');
      return {
        status: 'ok',
        service: 'sinhvien',
      };
    } catch (error) {
      return {
        status: 'down',
        service: 'sinhvien',
        message: error instanceof Error ? error.message : 'database unavailable',
      };
    }
  }
}
