/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `UserRefreshToken` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UserRefreshToken_userId_key" ON "UserRefreshToken"("userId");
