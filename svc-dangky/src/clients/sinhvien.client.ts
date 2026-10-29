import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { findById } from './find-by-id.js';

export interface SinhVienReference {
  MaSV: string;
  HoTen: string;
}

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

  findById(id: string | number, authorization?: string): Promise<SinhVienReference> {
    const url = `${this.url}/${encodeURIComponent(String(id))}`;
    return findById<SinhVienReference>(this.http, url, authorization);
  }
}
