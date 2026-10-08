import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'svc-detai:isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);
