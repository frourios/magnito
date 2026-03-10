import { z } from 'zod';

const APP_VERSION = z.string().parse(process.env.APP_VERSION);
const NEXT_PUBLIC_API_ORIGIN = z.string().parse(process.env.NEXT_PUBLIC_API_ORIGIN);

export { APP_VERSION, NEXT_PUBLIC_API_ORIGIN };
