import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/client';
import 'dotenv/config';

export const prismaClient = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
