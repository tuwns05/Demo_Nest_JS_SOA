import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { findById } from './find-by-id.js';

@Injectable()
export class DeTaiClient {
  private readonly base: string;
  constructor(private readonly http: HttpService, config: ConfigService) {
    this.base = config.getOrThrow<string>('SERVICE_URL_DETAI');
  }
  findById(id: string | number): Promise<unknown> {
    return findById(this.http, this.base, 'detai', 'đề tài', id);
  }
}
