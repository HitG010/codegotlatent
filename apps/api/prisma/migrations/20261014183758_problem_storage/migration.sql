-- DropForeignKey
ALTER TABLE "Problem" DROP CONSTRAINT "Problem_contestId_fkey";

-- DropForeignKey
ALTER TABLE "TestCase" DROP CONSTRAINT "TestCase_problemId_fkey";

-- DropIndex
DROP INDEX "Problem_contestId_contestIndex_key";

-- DropIndex
DROP INDEX "Problem_isPublic_difficulty_idx";

-- AlterTable
ALTER TABLE "Problem" DROP COLUMN "contestId",
DROP COLUMN "contestIndex",
DROP COLUMN "editorial",
DROP COLUMN "isPublic",
DROP COLUMN "memoryLimitKb",
DROP COLUMN "points",
DROP COLUMN "statement",
DROP COLUMN "testsVersion",
DROP COLUMN "timeLimitMs",
ADD COLUMN     "currentVersionId" TEXT,
ADD COLUMN     "packageUuid" TEXT NOT NULL,
ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Submission" DROP COLUMN "testsVersion",
ADD COLUMN     "problemVersionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "avatarId";

-- DropTable
DROP TABLE "TestCase";

-- CreateTable
CREATE TABLE "ProblemVersion" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "packageHash" TEXT NOT NULL,
    "statementHtml" TEXT NOT NULL,
    "editorialHtml" TEXT,
    "samples" JSONB NOT NULL,
    "timeLimitMs" INTEGER NOT NULL,
    "memoryLimitMb" INTEGER NOT NULL,
    "checker" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemTest" (
    "versionId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "isSample" BOOLEAN NOT NULL,
    "inputHash" TEXT NOT NULL,
    "answerHash" TEXT NOT NULL,

    CONSTRAINT "ProblemTest_pkey" PRIMARY KEY ("versionId","ordinal")
);

-- CreateTable
CREATE TABLE "Blob" (
    "hash" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Blob_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "ContestProblem" (
    "contestId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "points" INTEGER NOT NULL,

    CONSTRAINT "ContestProblem_pkey" PRIMARY KEY ("contestId","problemId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProblemVersion_problemId_number_key" ON "ProblemVersion"("problemId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "ContestProblem_contestId_label_key" ON "ContestProblem"("contestId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "Problem_packageUuid_key" ON "Problem"("packageUuid");

-- CreateIndex
CREATE UNIQUE INDEX "Problem_currentVersionId_key" ON "Problem"("currentVersionId");

-- CreateIndex
CREATE INDEX "Problem_publishedAt_idx" ON "Problem"("publishedAt");

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "ProblemVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemVersion" ADD CONSTRAINT "ProblemVersion_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTest" ADD CONSTRAINT "ProblemTest_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ProblemVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTest" ADD CONSTRAINT "ProblemTest_inputHash_fkey" FOREIGN KEY ("inputHash") REFERENCES "Blob"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTest" ADD CONSTRAINT "ProblemTest_answerHash_fkey" FOREIGN KEY ("answerHash") REFERENCES "Blob"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestProblem" ADD CONSTRAINT "ContestProblem_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestProblem" ADD CONSTRAINT "ContestProblem_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_problemVersionId_fkey" FOREIGN KEY ("problemVersionId") REFERENCES "ProblemVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

