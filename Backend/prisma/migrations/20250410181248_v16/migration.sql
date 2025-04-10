-- AlterTable
ALTER TABLE "ContestUser" ADD COLUMN     "finishTime" TIMESTAMP(3),
ADD COLUMN     "penalty" INTEGER,
ADD COLUMN     "score" INTEGER;

-- CreateTable
CREATE TABLE "ProblemUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "contestId" TEXT,
    "penalty" INTEGER,
    "isCorrect" BOOLEAN,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ProblemUser_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProblemUser" ADD CONSTRAINT "ProblemUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemUser" ADD CONSTRAINT "ProblemUser_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
