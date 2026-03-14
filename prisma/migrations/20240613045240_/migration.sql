/*
  Warnings:

  - Added the required column `salt` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `verifier` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL,
    "confirmationCode" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "verifier" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "userPoolId" TEXT NOT NULL,
    CONSTRAINT "User_userPoolId_fkey" FOREIGN KEY ("userPoolId") REFERENCES "UserPool" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("confirmationCode", "createdAt", "email", "id", "name", "refreshToken", "userPoolId", "verified") SELECT "confirmationCode", "createdAt", "email", "id", "name", "refreshToken", "userPoolId", "verified" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
