import { SetMetadata } from '@nestjs/common';

export const BUSINESS_CONTEXT_KEY = 'business_context';
export const SetBusinessContext = () => SetMetadata(BUSINESS_CONTEXT_KEY, true);
