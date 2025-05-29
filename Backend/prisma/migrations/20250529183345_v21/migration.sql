-- CreateTable
CREATE TABLE "ProblemTags" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "ProblemTags_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProblemTags" ADD CONSTRAINT "ProblemTags_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
