import type { HttpService } from '@nestjs/axios';

// Gọi GET và trả dữ liệu; chuyển tiếp JWT để service đích xác thực.
export async function findById<T>(
  http: HttpService,
  url: string,
  authorization?: string,
): Promise<T> {
  const response = await http.axiosRef.get(url, {
    headers: { Authorization: authorization },
  });
  return response.data as T;
}
