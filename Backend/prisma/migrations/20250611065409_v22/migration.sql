-- AddForeignKey
ALTER TABLE "ProblemUser" ADD CONSTRAINT "ProblemUser_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
