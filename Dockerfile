ARG SERVER_PORT=5050
ARG CLIENT_PORT=5051
ARG SSL_PORT=5052
ARG VERSION
ARG NEXT_PUBLIC_API_ORIGIN=http://localhost:$SERVER_PORT
ARG SSL_PORT=5052
ARG COGNITO_ACCESS_KEY=magnito-access-key
ARG COGNITO_SECRET_KEY=magnito-secret-key
ARG COGNITO_REGION=ap-northeast-1
ARG COGNITO_USER_POOL_ID=ap-northeast-1_default
ARG COGNITO_USER_POOL_CLIENT_ID=default-client-id
ARG DATABASE_URL=file:../../data/app.db
ARG SMTP_HOST=inbucket
ARG SMTP_PORT=2500
ARG SMTP_USER=fake_mail_user
ARG SMTP_PASS=fake_mail_password

FROM node:24-alpine3.22 AS builder

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci

COPY client/package.json client/package-lock.json client/
RUN npm ci --prefix client

COPY server/package.json server/package-lock.json server/
RUN npm ci --prefix server

COPY . ./

ARG SERVER_PORT
ARG CLIENT_PORT
ARG SSL_PORT
ARG VERSION
ARG NEXT_PUBLIC_API_ORIGIN
ARG SSL_PORT
ARG COGNITO_ACCESS_KEY
ARG COGNITO_SECRET_KEY
ARG COGNITO_REGION
ARG COGNITO_USER_POOL_ID
ARG COGNITO_USER_POOL_CLIENT_ID
ARG DATABASE_URL
ARG SMTP_HOST
ARG SMTP_PORT
ARG SMTP_USER
ARG SMTP_PASS

RUN npm run batch:writeVersion -- $VERSION
RUN npm run build

FROM node:24-alpine3.22

WORKDIR /usr/src/app

ARG SERVER_PORT
ARG CLIENT_PORT
ARG SSL_PORT
ARG NEXT_PUBLIC_API_ORIGIN
ARG COGNITO_ACCESS_KEY
ARG COGNITO_SECRET_KEY
ARG COGNITO_REGION
ARG COGNITO_USER_POOL_ID
ARG COGNITO_USER_POOL_CLIENT_ID
ARG DATABASE_URL
ARG SMTP_HOST
ARG SMTP_PORT
ARG SMTP_USER
ARG SMTP_PASS

ENV PORT=$SERVER_PORT
ENV SERVER_PORT=$SERVER_PORT
ENV CLIENT_PORT=$CLIENT_PORT
ENV SSL_PORT=$SSL_PORT
ENV NEXT_PUBLIC_API_ORIGIN=$NEXT_PUBLIC_API_ORIGIN
ENV COGNITO_ACCESS_KEY=$COGNITO_ACCESS_KEY
ENV COGNITO_SECRET_KEY=$COGNITO_SECRET_KEY
ENV COGNITO_REGION=$COGNITO_REGION
ENV COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID
ENV COGNITO_USER_POOL_CLIENT_ID=$COGNITO_USER_POOL_CLIENT_ID
ENV DATABASE_URL=$DATABASE_URL
ENV SMTP_HOST=$SMTP_HOST
ENV SMTP_PORT=$SMTP_PORT
ENV SMTP_USER=$SMTP_USER
ENV SMTP_PASS=$SMTP_PASS

COPY --chown=node package.json ./
COPY --chown=node client/package.json client/package-lock.json ./client/
COPY --chown=node server/package.json server/package-lock.json ./server/

RUN npm ci --omit=dev --prefix client
RUN npm ci --omit=dev --prefix server

COPY --chown=node --from=builder /usr/src/app/client/node_modules/.prisma client/node_modules/.prisma
COPY --chown=node --from=builder /usr/src/app/client/prisma client/prisma/
COPY --chown=node --from=builder /usr/src/app/client/.next client/.next/
COPY --chown=node --from=builder /usr/src/app/server/certificates server/certificates/
COPY --chown=node --from=builder /usr/src/app/server/node_modules/.prisma server/node_modules/.prisma
COPY --chown=node --from=builder /usr/src/app/server/index.js server/index.js
COPY --chown=node --from=builder /usr/src/app/server/prisma server/prisma/
COPY --chown=node --from=builder /usr/src/app/data data/

HEALTHCHECK --interval=5s --timeout=5s --retries=3 CMD wget --quiet --spider http://127.0.0.1:$PORT/public/health && wget --quiet --spider http://127.0.0.1:$CLIENT_PORT/publicApi/health && wget --quiet --spider --no-check-certificate https://127.0.0.1:$SSL_PORT || exit 1

EXPOSE ${PORT} ${CLIENT_PORT} ${SSL_PORT}
VOLUME ["/usr/src/app/data"]

USER node
CMD ["npm", "start"]
