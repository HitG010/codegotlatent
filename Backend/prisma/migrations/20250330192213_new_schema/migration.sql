-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "max_memory_limit" INTEGER NOT NULL DEFAULT 262144,
ADD COLUMN     "max_time_limit" INTEGER NOT NULL DEFAULT 2;
