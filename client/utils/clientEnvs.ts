import { z } from 'zod';

const APP_VERSION = z.string().parse(process.env.APP_VERSION);

export { APP_VERSION };
