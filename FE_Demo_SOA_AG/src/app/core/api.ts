import { HttpErrorResponse } from '@angular/common/http';

export const API_BASE = '/api';
export interface ServiceHealth {
  status: 'ok' | 'down';
  service: string;
  message?: string;
}
export interface MutationResponse<T> {
  message: string;
  data: T;
}

export function apiError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Có lỗi xảy ra. Vui lòng thử lại.';
  if (error.status === 0) return 'Không kết nối được máy chủ. Hãy kiểm tra gateway và thử lại.';
  if (error.status === 401)
    return 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.';
  if (error.status >= 500) return 'Dịch vụ đang không khả dụng. Vui lòng thử lại sau.';
  // Backend có thể bọc HttpException.getResponse() trong trường message.
  let value: unknown = error.error;
  for (let depth = 0; depth < 4; depth++) {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.filter((item) => typeof item === 'string').join('. ');
    if (value && typeof value === 'object' && 'message' in value) value = value.message;
    else break;
  }
  return 'Yêu cầu chưa được xử lý. Vui lòng kiểm tra dữ liệu.';
}
