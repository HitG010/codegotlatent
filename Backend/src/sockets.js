const cron = require("node-cron");
const schedule = require("node-schedule");
const prisma = require("./services/prisma");
const { submitContest } = require("./services/contest");

async function scheduleUpcomingContests(io) {
  const contests = await prisma.Contest.findMany({
    where: {
      status: "Upcoming",
      isScheduled: false, // Only schedule contests that are not already scheduled
    },
    select: {
      rankGuessStartTime: true,
      id: true,
    },
  });
  console.log("Contests:", contests);
  contests.forEach(async (contest) => {
    const rankGuessStartTime = new Date(contest.rankGuessStartTime);
    console.log("Rank Guess Start Time:", rankGuessStartTime);

    // Mark the contest as scheduled
    await prisma.Contest.update({
      where: {
        id: contest.id,
      },
      data: {
        isScheduled: true, // Set isScheduled to true to avoid rescheduling
      },
    });

    const date = rankGuessStartTime.getDate();
    const month = rankGuessStartTime.getMonth(); // 0-11
    const year = rankGuessStartTime.getFullYear();
    const hour = rankGuessStartTime.getHours();
    const minute = rankGuessStartTime.getMinutes();
    const second = rankGuessStartTime.getSeconds();
    // console.log("start time:", startTime);
    // const date = new Date(start);
    const RankGuessDate = new Date(year, month, date, hour, minute, second);
    // console.log("Start Time:", startTime);
    schedule.scheduleJob(RankGuessDate, async () => {
      console.log("Contest Rank Guess phase started:", contest.name);
      // Update the contest status to "Ongoing"
      const updatedContest = await prisma.Contest.update({
        where: {
          id: contest.id,
        },
        data: {
          status: "Rank Guess Phase",
          isScheduled: false,
        },
      });
      console.log("Contest updated:", updatedContest);
      io.emit("contestRankGuessPhaseStarted", {
        contestId: contest.id,
        updatedContest,
      });
    });
  });
}

async function scheduleRankGuessContests(io) {
  const contests = await prisma.Contest.findMany({
    where: {
      status: "Rank Guess Phase",
      isScheduled: false, // Only schedule contests that are not already scheduled
    },
    select: {
      startTime: true,
      id: true,
    },
  });
  console.log("Contests:", contests);
  contests.forEach(async (contest) => {
    const startTime = new Date(contest.startTime);
    console.log("Start Time:", startTime);

    // Mark the contest as scheduled
    await prisma.Contest.update({
      where: {
        id: contest.id,
      },
      data: {
        isScheduled: true, // Set isScheduled to true to avoid rescheduling
      },
    });

    const date = startTime.getDate();
    const month = startTime.getMonth(); // 0-11
    const year = startTime.getFullYear();
    const hour = startTime.getHours();
    const minute = startTime.getMinutes();
    const second = startTime.getSeconds();
    // console.log("start time:", startTime);
    // const date = new Date(start);
    const StartDate = new Date(year, month, date, hour, minute, second);
    // console.log("Start Time:", startTime);
    schedule.scheduleJob(StartDate, async () => {
      console.log("Contest started:", contest.name);
      // Update the contest status to "Ongoing"
      const updatedContest = await prisma.Contest.update({
        where: {
          id: contest.id,
        },
        data: {
          status: "Ongoing",
          isScheduled: false, // Set isScheduled to false to avoid rescheduling
        },
      });
      console.log("Contest updated:", updatedContest);
      io.emit("contestStarted", { contestId: contest.id, updatedContest });
    });
  });
}

async function scheduleOngoingContests(io) {
  const contests = await prisma.Contest.findMany({
    where: {
      status: "Ongoing",
      isScheduled: false, // Only schedule contests that are not already scheduled
    },
    select: {
      endTime: true,
      id: true,
    },
  });
  console.log("Contests:", contests);
  contests.forEach(async (contest) => {
    const endTime = new Date(contest.endTime);
    console.log("End Time:", endTime);

    // Mark the contest as scheduled
    await prisma.Contest.update({
      where: {
        id: contest.id,
      },
      data: {
        isScheduled: true, // Set isScheduled to true to avoid rescheduling
      },
    });
    const date = endTime.getDate();
    const month = endTime.getMonth(); // 0-11
    const year = endTime.getFullYear();
    const hour = endTime.getHours();
    const minute = endTime.getMinutes();
    const second = endTime.getSeconds();
    // console.log("end time:", endTime);
    // const date = new Date(end);
    const EndDate = new Date(year, month, date, hour, minute, second);
    // console.log("End Time:", endTime);
    schedule.scheduleJob(EndDate, async () => {
      console.log("Contest rating update phase started:", contest.name);
      // Update the contest status to "Ended"
      const updatedContest = await prisma.Contest.update({
        where: {
          id: contest.id,
        },
        data: {
          status: "Rating Update Pending",
          isScheduled: false, // Set isScheduled to false to avoid rescheduling
        },
      });
      console.log("Contest updated:", updatedContest);
      // call the ranking update
      console.log("Submitting contest for rating update:", contest.id);
      submitContest(contest.id);
      io.emit("contestRatingPending", {
        contestId: contest.id,
        updatedContest,
      });
    });
  });
}

async function scheduleRatingPendingContests(io) {
  const contests = await prisma.Contest.findMany({
    where: {
      status: "Rating Update Pending",
      isScheduled: false, // Only schedule contests that are not already scheduled
    },
    select: {
      endTime: true,
      id: true,
    },
  });
  console.log("Contests:", contests);
  contests.forEach(async (contest) => {
    const endTime = new Date(contest.endTime);
    console.log("End Time:", endTime);

    // Mark the contest as scheduled
    await prisma.Contest.update({
      where: {
        id: contest.id,
      },
      data: {
        isScheduled: true, // Set isScheduled to true to avoid rescheduling
      },
    });
    const date = endTime.getDate();
    const month = endTime.getMonth(); // 0-11
    const year = endTime.getFullYear();
    const hour = endTime.getHours();
    const minute = endTime.getMinutes();
    const second = endTime.getSeconds();
    // console.log("end time:", endTime);
    // const date = new Date(end);
    const EndDate = new Date(year, month, date, hour, minute, second);
    // console.log("End Time:", endTime);
    schedule.scheduleJob(
      new Date(EndDate.getTime() + 2 * 60 * 1000),
      async () => {
        console.log("Contest Rating Update Phase Started:", contest.name);
        // Update the contest status to "Ended"
        const updatedContest = await prisma.Contest.update({
          where: {
            id: contest.id,
          },
          data: {
            status: "Ended",
            // isScheduled: false, // Set isScheduled to false to avoid rescheduling
          },
        });
        console.log("Contest updated:", updatedContest);
        io.emit("contestEnded", { contestId: contest.id, updatedContest });
      }
    );
  });
}

async function scheduler(io) {
  cron.schedule("*/1 * * * *", async () => {
    console.log("Scheduling contests");
    // status -> upcoming, rank guess, ongoing, rating pending, ended
    // await scheduleUpcomingContests(io);
    // await scheduleRankGuessContests(io);
    // await scheduleOngoingContests(io);
    // await scheduleRatingPendingContests(io);
    console.log("Contests scheduled");
  });
}

module.exports = {
  scheduleUpcomingContests,
  scheduleRankGuessContests,
  scheduleOngoingContests,
  scheduleRatingPendingContests,
  scheduler,
};
