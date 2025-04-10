/*
  Warnings:

  - A unique constraint covering the columns `[userId,problemId]` on the table `ProblemUser` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ProblemUser_userId_problemId_key" ON "ProblemUser"("userId", "problemId");
