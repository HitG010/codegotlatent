/*
  Warnings:

  - You are about to drop the column `problemScore` on the `Problem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Problem" DROP COLUMN "problemScore";

-- AlterTable
ALTER TABLE "ProblemUser" ADD COLUMN     "score" INTEGER;
