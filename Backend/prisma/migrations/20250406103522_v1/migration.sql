/*
  Warnings:

  - You are about to drop the column `isPublic` on the `Problem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Problem" DROP COLUMN "isPublic",
ADD COLUMN     "problemScore" INTEGER;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "contestId" TEXT;
