/*
  Warnings:

  - A unique constraint covering the columns `[refreshToken]` on the table `UserRefreshToken` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UserRefreshToken_refreshToken_key" ON "UserRefreshToken"("refreshToken");
