/*
  Warnings:

  - Made the column `refreshToken` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "refreshToken" SET NOT NULL,
ALTER COLUMN "refreshToken" SET DEFAULT '';
