import dotenv from 'dotenv';
import { brandedId } from 'schemas/brandedId';
import { z } from 'zod';
import rootPackage from '../../../package.json';

dotenv.config();

const APP_VERSION = `v${z.string().parse(rootPackage.version)}`;
const SERVER_PORT = +z.string().regex(/^\d+$/).parse(process.env.SERVER_PORT);
const SSL_PORT = +z.string().regex(/^\d+$/).parse(process.env.SSL_PORT);
const SMTP_HOST = z.string().parse(process.env.SMTP_HOST);
const SMTP_PASS = z.string().parse(process.env.SMTP_PASS);
const SMTP_PORT = +z.string().regex(/^\d+$/).parse(process.env.SMTP_PORT);
const SMTP_USER = z.string().parse(process.env.SMTP_USER);
const ACCESS_KEY = z.string().parse(process.env.COGNITO_ACCESS_KEY);
const REGION = z.string().parse(process.env.COGNITO_REGION);
const SECRET_KEY = z.string().parse(process.env.COGNITO_SECRET_KEY);
const DEFAULT_USER_POOL_ID = brandedId.userPool.dto.parse(process.env.COGNITO_USER_POOL_ID);
const DEFAULT_USER_POOL_CLIENT_ID = brandedId.userPoolClient.dto.parse(
  process.env.COGNITO_USER_POOL_CLIENT_ID,
);

export {
  ACCESS_KEY,
  APP_VERSION,
  DEFAULT_USER_POOL_CLIENT_ID,
  DEFAULT_USER_POOL_ID,
  SERVER_PORT,
  REGION,
  SECRET_KEY,
  SMTP_HOST,
  SMTP_PASS,
  SMTP_PORT,
  SMTP_USER,
  SSL_PORT,
};
