FROM node:24-alpine3.22 AS builder

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci

COPY client/package.json client/package-lock.json client/
RUN npm ci --prefix client

COPY server/package.json server/package-lock.json server/
RUN npm ci --prefix server

COPY . ./

ARG SERVER_PORT=5050
ARG VERSION
ARG NEXT_PUBLIC_API_ORIGIN=http://localhost:$SERVER_PORT

RUN npm run batch:writeVersion -- $VERSION
RUN npm run build
RUN npm ci --omit=dev --prefix server

FROM node:24-alpine3.22

WORKDIR /usr/src/app

ARG CLIENT_PORT=5051
ARG SSL_PORT=5052

ENV PORT=5050
ENV CLIENT_PORT=$CLIENT_PORT
ENV SSL_PORT=$SSL_PORT
ENV COGNITO_ACCESS_KEY=magnito-access-key
ENV COGNITO_SECRET_KEY=magnito-secret-key
ENV COGNITO_REGION=ap-northeast-1
ENV COGNITO_USER_POOL_ID=ap-northeast-1_default
ENV COGNITO_USER_POOL_CLIENT_ID=default-client-id
ENV DATABASE_URL=file:../../data/app.db
ENV SMTP_HOST=inbucket
ENV SMTP_PORT=2500
ENV SMTP_USER=fake_mail_user
ENV SMTP_PASS=fake_mail_password

COPY --chown=node package.json ./
COPY --chown=node server/package.json server/package-lock.json ./server/

COPY --chown=node --from=builder /usr/src/app/client/out client/out/
COPY --chown=node --from=builder /usr/src/app/server/certificates server/certificates/
COPY --chown=node --from=builder /usr/src/app/server/node_modules server/node_modules/
COPY --chown=node --from=builder /usr/src/app/server/index.js server/index.js
COPY --chown=node --from=builder /usr/src/app/server/prisma server/prisma/
COPY --chown=node --from=builder /usr/src/app/data data/

HEALTHCHECK --interval=5s --timeout=5s --retries=3 CMD wget --quiet --spider http://127.0.0.1:$PORT/public/health && wget --quiet --spider http://127.0.0.1:$CLIENT_PORT && wget --quiet --spider --no-check-certificate https://127.0.0.1:$SSL_PORT || exit 1

EXPOSE ${PORT} ${CLIENT_PORT} ${SSL_PORT}
VOLUME ["/usr/src/app/data"]

USER node
CMD ["npm", "start"]
