import { $fc } from 'src/app/frourio.client';

export const apiClient = $fc({ init: { credentials: 'same-origin' } });
