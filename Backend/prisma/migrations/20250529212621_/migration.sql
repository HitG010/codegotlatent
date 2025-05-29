/*
  Warnings:

  - You are about to drop the column `isCorrect` on the `ProblemUser` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProblemUser" DROP COLUMN "isCorrect",
ADD COLUMN     "isSolved" BOOLEAN,
ADD COLUMN     "solvedInContest" BOOLEAN;
