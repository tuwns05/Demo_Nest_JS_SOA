import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { findById } from './find-by-id.js';

@Injectable()
export class SinhVienClient {
  private readonly base: string;
  constructor(private readonly http: HttpService, config: ConfigService) {
    this.base = config.getOrThrow<string>('SERVICE_URL_SINHVIEN');
  }
  findById(id: string | number): Promise<unknown> {
    return findById(this.http, this.base, 'sinhvien', 'sinh viên', id);
  }
}
