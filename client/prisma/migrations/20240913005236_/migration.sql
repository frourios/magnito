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
    "refreshToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "provider" TEXT,
    "secretBlock" TEXT,
    "pubA" TEXT,
    "pubB" TEXT,
    "secB" TEXT,
    "userPoolId" TEXT NOT NULL,
    CONSTRAINT "User_userPoolId_fkey" FOREIGN KEY ("userPoolId") REFERENCES "UserPool" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("confirmationCode", "createdAt", "email", "enabled", "id", "kind", "name", "password", "pubA", "pubB", "refreshToken", "salt", "secB", "secretBlock", "status", "updatedAt", "userPoolId", "verifier") SELECT "confirmationCode", "createdAt", "email", "enabled", "id", "kind", "name", "password", "pubA", "pubB", "refreshToken", "salt", "secB", "secretBlock", "status", "updatedAt", "userPoolId", "verifier" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
