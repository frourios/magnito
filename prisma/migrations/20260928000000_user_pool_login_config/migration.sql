-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordHistory" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "temporaryPasswordExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserPool" ADD COLUMN     "adminCreateUserOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aliasAttributes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "allowedFirstAuthFactors" TEXT[] DEFAULT ARRAY['PASSWORD']::TEXT[],
ADD COLUMN     "autoVerifiedAttributes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "mfaConfiguration" TEXT NOT NULL DEFAULT 'OFF',
ADD COLUMN     "passwordHistorySize" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "passwordMinimumLength" INTEGER NOT NULL DEFAULT 8,
ADD COLUMN     "passwordRequireLowercase" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "passwordRequireNumbers" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "passwordRequireSymbols" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "passwordRequireUppercase" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "temporaryPasswordValidityDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "usernameAttributes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "UserPoolClient" ADD COLUMN     "allowedOAuthFlows" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "allowedOAuthFlowsUserPoolClient" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowedOAuthScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "callbackUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "clientSecret" TEXT,
ADD COLUMN     "defaultRedirectUri" TEXT,
ADD COLUMN     "explicitAuthFlows" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "logoutUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "supportedIdentityProviders" TEXT[] DEFAULT ARRAY['COGNITO']::TEXT[];

-- CreateTable
CREATE TABLE "UserPoolDomain" (
    "domain" TEXT NOT NULL,
    "managedLoginVersion" INTEGER NOT NULL DEFAULT 1,
    "certificateArn" TEXT,
    "securityPolicy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "userPoolId" TEXT NOT NULL,

    CONSTRAINT "UserPoolDomain_pkey" PRIMARY KEY ("domain")
);

-- CreateTable
CREATE TABLE "IdentityProvider" (
    "userPoolId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "providerDetails" JSONB NOT NULL,
    "attributeMapping" JSONB,
    "idpIdentifiers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentityProvider_pkey" PRIMARY KEY ("userPoolId","providerName")
);

-- CreateTable
CREATE TABLE "ManagedLoginBranding" (
    "id" TEXT NOT NULL,
    "userPoolId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "useCognitoProvidedValues" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagedLoginBranding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedLoginBrandingAsset" (
    "id" TEXT NOT NULL,
    "brandingId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "colorMode" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "bytes" BYTEA,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ManagedLoginBrandingAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManagedLoginBranding_clientId_key" ON "ManagedLoginBranding"("clientId");

-- CreateIndex
CREATE INDEX "ManagedLoginBrandingAsset_brandingId_position_idx" ON "ManagedLoginBrandingAsset"("brandingId", "position");

-- AddForeignKey
ALTER TABLE "UserPoolDomain" ADD CONSTRAINT "UserPoolDomain_userPoolId_fkey" FOREIGN KEY ("userPoolId") REFERENCES "UserPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityProvider" ADD CONSTRAINT "IdentityProvider_userPoolId_fkey" FOREIGN KEY ("userPoolId") REFERENCES "UserPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedLoginBranding" ADD CONSTRAINT "ManagedLoginBranding_userPoolId_fkey" FOREIGN KEY ("userPoolId") REFERENCES "UserPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedLoginBranding" ADD CONSTRAINT "ManagedLoginBranding_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "UserPoolClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedLoginBrandingAsset" ADD CONSTRAINT "ManagedLoginBrandingAsset_brandingId_fkey" FOREIGN KEY ("brandingId") REFERENCES "ManagedLoginBranding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "OAuthAuthorizationCode" (
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "codeChallenge" TEXT,
    "codeChallengeMethod" TEXT,
    "scope" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OAuthAuthorizationCode_pkey" PRIMARY KEY ("code")
);

ALTER TABLE "OAuthAuthorizationCode" ADD CONSTRAINT "OAuthAuthorizationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OAuthAuthorizationCode" ADD CONSTRAINT "OAuthAuthorizationCode_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "UserPoolClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
