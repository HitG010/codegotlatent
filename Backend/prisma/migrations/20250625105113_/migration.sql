/*
  Warnings:

  - You are about to drop the column `problemId` on the `ProblemTags` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProblemTags" DROP CONSTRAINT "ProblemTags_problemId_fkey";

-- AlterTable
ALTER TABLE "ProblemTags" DROP COLUMN "problemId";

-- CreateTable
CREATE TABLE "_ProblemToTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProblemToTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ProblemToTags_B_index" ON "_ProblemToTags"("B");

-- AddForeignKey
ALTER TABLE "_ProblemToTags" ADD CONSTRAINT "_ProblemToTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProblemToTags" ADD CONSTRAINT "_ProblemToTags_B_fkey" FOREIGN KEY ("B") REFERENCES "ProblemTags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
