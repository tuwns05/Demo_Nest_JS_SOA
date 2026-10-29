import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { findById } from './find-by-id.js';

export interface DeTaiReference {
  MaDT: number;
  TenDT: string;
}

@Injectable()
export class DeTaiClient {
  private readonly url: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.url =
      config.getOrThrow<string>('SERVICE_URL_DETAI').replace(/\/$/, '') +
      '/detai';
  }

  findById(id: string | number, authorization?: string): Promise<DeTaiReference> {
    const url = `${this.url}/${encodeURIComponent(String(id))}`;
    return findById<DeTaiReference>(this.http, url, authorization);
  }
}
