import { Injectable } from '@angular/core';
import { HealthStore } from '../../core/health.store';

@Injectable({ providedIn: 'root' })
export class DangKyService extends HealthStore {
  constructor() {
    super('dangky');
  }
}
