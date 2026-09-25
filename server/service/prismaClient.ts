import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../prisma/client';
import 'dotenv/config';

export const prismaClient = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL }),
});
