import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = '1b06cf8b17730a7a8c4e279c3eea613557e3cb5adecda9ee6e96107902dc6000';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);