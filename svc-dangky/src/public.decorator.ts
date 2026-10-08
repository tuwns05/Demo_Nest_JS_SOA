import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'svc-dangky:isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);
