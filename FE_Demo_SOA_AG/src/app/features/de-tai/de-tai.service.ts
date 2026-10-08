import { Injectable } from '@angular/core';
import { HealthStore } from '../../core/health.store';

@Injectable({ providedIn: 'root' })
export class DeTaiService extends HealthStore {
  constructor() {
    super('detai');
  }
}
