CREATE TABLE "UserPoolClientSecret" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserPoolClientSecret_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserPoolClientSecret_clientId_createdAt_idx" ON "UserPoolClientSecret"("clientId", "createdAt");
ALTER TABLE "UserPoolClientSecret" ADD CONSTRAINT "UserPoolClientSecret_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "UserPoolClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "UserPoolClientSecret" ("id", "clientId", "value", "createdAt")
SELECT "id" || '--' || (EXTRACT(EPOCH FROM "createdAt") * 1000)::BIGINT, "id", "clientSecret", "createdAt"
FROM "UserPoolClient" WHERE "clientSecret" IS NOT NULL;

ALTER TABLE "UserPoolClient" DROP COLUMN "clientSecret";

CREATE TABLE "Terms" (
    "id" TEXT NOT NULL,
    "userPoolId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "enforcement" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Terms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TermsLink" (
    "termsId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    CONSTRAINT "TermsLink_pkey" PRIMARY KEY ("termsId", "language")
);

CREATE UNIQUE INDEX "Terms_clientId_name_key" ON "Terms"("clientId", "name");
CREATE INDEX "Terms_userPoolId_createdAt_id_idx" ON "Terms"("userPoolId", "createdAt", "id");
ALTER TABLE "Terms" ADD CONSTRAINT "Terms_userPoolId_fkey" FOREIGN KEY ("userPoolId") REFERENCES "UserPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Terms" ADD CONSTRAINT "Terms_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "UserPoolClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TermsLink" ADD CONSTRAINT "TermsLink_termsId_fkey" FOREIGN KEY ("termsId") REFERENCES "Terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
