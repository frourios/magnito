/*
  Warnings:

  - You are about to drop the column `imageKey` on the `Task` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN "enabled" BOOLEAN;
ALTER TABLE "User" ADD COLUMN "status" TEXT;
ALTER TABLE "User" ADD COLUMN "updatedAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL
);
INSERT INTO "new_Task" ("createdAt", "done", "id", "label") SELECT "createdAt", "done", "id", "label" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
