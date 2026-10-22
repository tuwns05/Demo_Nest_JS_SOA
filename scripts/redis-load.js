// Run with k6; do not run this file with Node.js.
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    cold_key: { executor: 'per-vu-iterations', vus: 100, iterations: 1, maxDuration: '30s' },
  },
  thresholds: { http_req_failed: ['rate<0.01'] },
};

export default function () {
  if (!__ENV.DEMO_TOKEN) throw new Error('Set DEMO_TOKEN to a valid JWT');
  const response = http.get(__ENV.DEMO_URL || 'http://localhost:3000/detai/1', {
    headers: { Authorization: `Bearer ${__ENV.DEMO_TOKEN}` },
  });
  check(response, { 'HTTP 200': result => result.status === 200 });
}
