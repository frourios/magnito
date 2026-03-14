import { $fc } from 'app/frourio.client';

export const apiClient = $fc({ init: { credentials: 'same-origin' } });
