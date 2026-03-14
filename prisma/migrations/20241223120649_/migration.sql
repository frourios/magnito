-- AlterTable
ALTER TABLE "User" ADD COLUMN "enabledTotp" BOOLEAN;
ALTER TABLE "User" ADD COLUMN "preferredMfaSetting" TEXT;
