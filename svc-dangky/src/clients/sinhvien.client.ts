import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { findById } from './find-by-id.js';

@Injectable()
export class SinhVienClient {
  private readonly url: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.url =
      config.getOrThrow<string>('SERVICE_URL_SINHVIEN').replace(/\/$/, '') +
      '/sinhvien';
  }

  findById(id: string | number, authorization?: string): Promise<unknown> {
    const url = `${this.url}/${encodeURIComponent(String(id))}`;
    return findById(this.http, url, authorization);
  }
}
