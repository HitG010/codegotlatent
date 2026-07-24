const schedule = require("node-schedule");
const prisma = require("./services/prisma");
const { submitContest } = require("./services/contest");

// Contests whose endTime passed longer ago than this are closed out on boot
// without running the rating update — computing ratings for a contest that
// never actually ran would corrupt real user ratings.
const STALE_CONTEST_GRACE_MS = 60 * 60 * 1000; // 1 hour

// One in-memory timer per contest. Re-arming a contest (e.g. after an admin
// edits its times) must cancel the old timer, otherwise both would fire.
const jobs = new Map();

function armContestJob(contestId, date, transition) {
  const existing = jobs.get(contestId);
  if (existing) {
    existing.cancel();
    jobs.delete(contestId);
  }
  const run = () => {
    jobs.delete(contestId);
    transition().catch((err) =>
      console.error("Contest transition failed:", contestId, err)
    );
  };
  // node-schedule silently ignores past dates — run missed transitions now
  if (!date || date.getTime() <= Date.now()) {
    setImmediate(run);
    return;
  }
  jobs.set(contestId, schedule.scheduleJob(date, run));
}

async function scheduleUpcomingContest(io, contestId) {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId, isScheduled: false },
    select: { rankGuessStartTime: true, startTime: true },
  });
  if (!contest) {
    console.error("Contest not found or already scheduled:", contestId);
    return;
  }

  await prisma.contest.update({
    where: { id: contestId },
    data: { isScheduled: true },
  });

  // Contests without a rank guess phase go straight to the start transition
  const rankGuessStartTime = new Date(
    contest.rankGuessStartTime ?? contest.startTime
  );

  armContestJob(contestId, rankGuessStartTime, async () => {
    const updatedContest = await prisma.contest.update({
      where: { id: contestId },
      data: { status: "Rank Guess Phase", isScheduled: false },
    });
    console.log("Contest Rank Guess phase started:", contestId);
    io.emit("contestRankGuessPhaseStarted", {
      contestId: contestId,
      updatedContest: updatedContest,
    });
    await scheduleRankGuessContest(io, contestId);
  });
}

async function scheduleRankGuessContest(io, contestId) {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId, isScheduled: false },
    select: { startTime: true },
  });
  if (!contest) {
    console.error("Contest not found or already scheduled:", contestId);
    return;
  }

  await prisma.contest.update({
    where: { id: contestId },
    data: { isScheduled: true },
  });

  armContestJob(contestId, new Date(contest.startTime), async () => {
    const updatedContest = await prisma.contest.update({
      where: { id: contestId },
      data: { status: "Ongoing", isScheduled: false },
    });
    console.log("Contest started:", contestId);
    io.emit("contestStarted", {
      contestId: contestId,
      updatedContest: updatedContest,
    });
    await scheduleOngoingContest(io, contestId);
  });
}

async function scheduleOngoingContest(io, contestId) {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId, isScheduled: false },
    select: { endTime: true },
  });
  if (!contest) {
    console.error("Contest not found or already scheduled:", contestId);
    return;
  }

  await prisma.contest.update({
    where: { id: contestId },
    data: { isScheduled: true },
  });

  armContestJob(contestId, new Date(contest.endTime), async () => {
    const updatedContest = await prisma.contest.update({
      where: { id: contestId },
      data: { status: "Rating Update Pending", isScheduled: false },
    });
    console.log("Contest ended, computing ratings:", contestId);
    try {
      await submitContest(contestId);
    } catch (err) {
      // A failed rating run (e.g. no participants) must not stall the contest
      console.error("Rating update failed for contest:", contestId, err);
    }
    io.emit("contestRatingPending", {
      contestId: contestId,
      updatedContest: updatedContest,
    });
    await scheduleRatingPendingContest(io, contestId);
  });
}

async function scheduleRatingPendingContest(io, contestId) {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId, isScheduled: false },
    select: { endTime: true },
  });
  if (!contest) {
    console.error("Contest not found or already scheduled:", contestId);
    return;
  }

  await prisma.contest.update({
    where: { id: contestId },
    data: { isScheduled: true },
  });

  const endTime = new Date(contest.endTime);
  armContestJob(contestId, new Date(endTime.getTime() + 2 * 60 * 1000), async () => {
    const updatedContest = await prisma.contest.update({
      where: { id: contestId },
      data: { status: "Ended" },
    });
    console.log("Contest ended:", contestId);
    io.emit("contestEnded", {
      contestId: contestId,
      updatedContest: updatedContest,
    });
  });
}

// Re-arm every non-Ended contest on boot. In-memory timers die with the
// process and leave isScheduled stuck at true, which otherwise blocks all
// rescheduling of those contests forever.
async function reconcileContests(io) {
  await prisma.contest.updateMany({
    where: { status: { not: "Ended" }, isScheduled: true },
    data: { isScheduled: false },
  });

  const contests = await prisma.contest.findMany({
    where: { status: { not: "Ended" } },
    select: { id: true, name: true, status: true, endTime: true },
  });

  for (const contest of contests) {
    try {
      const missedBy = Date.now() - new Date(contest.endTime).getTime();
      if (missedBy > STALE_CONTEST_GRACE_MS) {
        // The contest window was missed entirely while no server was running.
        // Close it out without touching ratings; an admin can reschedule it
        // via the edit endpoint if it should run for real.
        await prisma.contest.update({
          where: { id: contest.id },
          data: { status: "Ended", isScheduled: false },
        });
        console.warn(
          `Reconcile: closed stale contest without rating update: ${contest.name} (${contest.id}), ended ${Math.round(missedBy / 3600000)}h ago`
        );
        continue;
      }

      switch (contest.status) {
        case "Upcoming":
          await scheduleUpcomingContest(io, contest.id);
          break;
        case "Rank Guess Phase":
          await scheduleRankGuessContest(io, contest.id);
          break;
        case "Ongoing":
          await scheduleOngoingContest(io, contest.id);
          break;
        case "Rating Update Pending":
          await scheduleRatingPendingContest(io, contest.id);
          break;
        default:
          console.error(
            "Reconcile: unknown contest status:",
            contest.id,
            contest.status
          );
      }
    } catch (err) {
      console.error("Reconcile failed for contest:", contest.id, err);
    }
  }
  console.log(`Contest scheduler: reconciled ${contests.length} contest(s)`);
}

module.exports = {
  scheduleUpcomingContest,
  scheduleRankGuessContest,
  scheduleOngoingContest,
  scheduleRatingPendingContest,
  reconcileContests,
};
