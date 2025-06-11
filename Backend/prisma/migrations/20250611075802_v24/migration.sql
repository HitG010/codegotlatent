/*
  Warnings:

  - You are about to drop the column `penalty` on the `ContestUser` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `ContestUser` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ContestUser" DROP COLUMN "penalty",
DROP COLUMN "score";
