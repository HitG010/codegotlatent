-- AlterTable
ALTER TABLE "Contest" ADD COLUMN     "numberOfParticipants" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;
