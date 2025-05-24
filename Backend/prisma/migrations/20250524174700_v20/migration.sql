-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pastRatings" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
