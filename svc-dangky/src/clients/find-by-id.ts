import type { HttpService } from '@nestjs/axios';

// Gọi GET và trả dữ liệu; chuyển tiếp JWT để service đích xác thực.
export async function findById(
  http: HttpService,
  url: string,
  authorization?: string,
): Promise<unknown> {
  const response = await http.axiosRef.get(url, {
    headers: { Authorization: authorization },
  });
  return response.data;
}
