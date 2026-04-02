/*
  Warnings:

  - You are about to drop the column `refreshToken` on the `User` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "UserToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revoked" BOOLEAN NOT NULL,
    "revokedAt" DATETIME,
    "userId" TEXT NOT NULL,
    CONSTRAINT "UserToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL,
    "password" TEXT,
    "confirmationCode" TEXT,
    "salt" TEXT,
    "verifier" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "provider" TEXT,
    "authorizationCode" TEXT,
    "codeChallenge" TEXT,
    "secretBlock" TEXT,
    "pubA" TEXT,
    "pubB" TEXT,
    "secB" TEXT,
    "srpAuthTimestamp" TEXT,
    "srpAuthClientSignature" TEXT,
    "preferredMfaSetting" TEXT,
    "enabledTotp" BOOLEAN,
    "totpSecretCode" TEXT,
    "userPoolId" TEXT NOT NULL,
    CONSTRAINT "User_userPoolId_fkey" FOREIGN KEY ("userPoolId") REFERENCES "UserPool" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("authorizationCode", "codeChallenge", "confirmationCode", "createdAt", "email", "enabled", "enabledTotp", "id", "kind", "name", "password", "preferredMfaSetting", "provider", "pubA", "pubB", "salt", "secB", "secretBlock", "srpAuthClientSignature", "srpAuthTimestamp", "status", "totpSecretCode", "updatedAt", "userPoolId", "verifier") SELECT "authorizationCode", "codeChallenge", "confirmationCode", "createdAt", "email", "enabled", "enabledTotp", "id", "kind", "name", "password", "preferredMfaSetting", "provider", "pubA", "pubB", "salt", "secB", "secretBlock", "srpAuthClientSignature", "srpAuthTimestamp", "status", "totpSecretCode", "updatedAt", "userPoolId", "verifier" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
