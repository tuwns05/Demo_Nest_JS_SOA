import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'public:auth';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);