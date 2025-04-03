-- AlterTable
ALTER TABLE "Contest" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Upcoming';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "name" TEXT;
