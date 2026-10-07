import type { ConfigService } from '@nestjs/config';

export function jwtOptions(config: ConfigService) {
  const secret = config.get<string>('JWT_SECRET') ?? '';
  if (secret.trim().length < 32 || secret === 'replace-with-a-random-secret') {
    throw new Error('JWT_SECRET phải là khóa ngẫu nhiên ít nhất 32 ký tự, không được rỗng hoặc dùng giá trị mẫu. Xem .env.example.');
  }
  return {
    secret,
    signOptions: { expiresIn: config.getOrThrow<string>('JWT_EXPIRES_IN') as `${number}${'s' | 'm' | 'h' | 'd'}` },
  };
}
