const cron = require("node-cron");
const schedule = require("node-schedule");
const prisma = require("./services/prisma");
const { submitContest } = require("./services/contest");

// Keep track of scheduled jobs to prevent duplicates
const scheduledJobs = new Map();

// Helper function to create a unique job key
const createJobKey = (contestId, phase) => `${contestId}-${phase}`;

// Helper function to cancel existing job if it exists
const cancelExistingJob = (jobKey) => {
  if (scheduledJobs.has(jobKey)) {
    const existingJob = scheduledJobs.get(jobKey);
    existingJob.cancel();
    scheduledJobs.delete(jobKey);
    console.log(`Cancelled existing job: ${jobKey}`);
  }
};

async function scheduleUpcomingContests(io) {
  const contests = await prisma.Contest.findMany({
    where: {
      status: "Upcoming",
    },
    select: {
      rankGuessStartTime: true,
      id: true,
      name: true,
    },
  });
  console.log("Contests:", contests);
  
  contests.forEach((contest) => {
    const jobKey = createJobKey(contest.id, "rankGuess");
    
    // Cancel existing job if any
    cancelExistingJob(jobKey);
    
    const rankGuessStartTime = new Date(contest.rankGuessStartTime);
    console.log("Rank Guess Start Time:", rankGuessStartTime);

    // Only schedule if the time is in the future
    if (rankGuessStartTime > new Date()) {
      const date = rankGuessStartTime.getDate();
      const month = rankGuessStartTime.getMonth(); // 0-11
      const year = rankGuessStartTime.getFullYear();
      const hour = rankGuessStartTime.getHours();
      const minute = rankGuessStartTime.getMinutes();
      const second = rankGuessStartTime.getSeconds();
      
      const RankGuessDate = new Date(year, month, date, hour, minute, second);
      
      const job = schedule.scheduleJob(RankGuessDate, async () => {
        console.log("Contest Rank Guess phase started:", contest.name);
        // Update the contest status to "Ongoing"
        const updatedContest = await prisma.Contest.update({
          where: {
            id: contest.id,
          },
          data: {
            status: "Rank Guess Phase",
          },
        });
        console.log("Contest updated:", updatedContest);
        io.emit("contestRankGuessPhaseStarted", {
          contestId: contest.id,
          updatedContest,
        });
        
        // Remove from scheduled jobs map after execution
        scheduledJobs.delete(jobKey);
      });
      
      // Store the job reference
      scheduledJobs.set(jobKey, job);
      console.log(`Scheduled rank guess phase for contest ${contest.id} at ${RankGuessDate}`);
    }
  });
}

async function scheduleRankGuessContests(io) {
  const contests = await prisma.Contest.findMany({
    where: {
      status: "Rank Guess Phase",
    },
    select: {
      startTime: true,
      id: true,
      name: true,
    },
  });
  console.log("Contests:", contests);
  
  contests.forEach((contest) => {
    const jobKey = createJobKey(contest.id, "start");
    
    // Cancel existing job if any
    cancelExistingJob(jobKey);
    
    const startTime = new Date(contest.startTime);
    console.log("Start Time:", startTime);

    // Only schedule if the time is in the future
    if (startTime > new Date()) {
      const date = startTime.getDate();
      const month = startTime.getMonth(); // 0-11
      const year = startTime.getFullYear();
      const hour = startTime.getHours();
      const minute = startTime.getMinutes();
      const second = startTime.getSeconds();
      
      const StartDate = new Date(year, month, date, hour, minute, second);
      
      const job = schedule.scheduleJob(StartDate, async () => {
        console.log("Contest started:", contest.name);
        // Update the contest status to "Ongoing"
        const updatedContest = await prisma.Contest.update({
          where: {
            id: contest.id,
          },
          data: {
            status: "Ongoing",
          },
        });
        console.log("Contest updated:", updatedContest);
        io.emit("contestStarted", { contestId: contest.id, updatedContest });
        
        // Remove from scheduled jobs map after execution
        scheduledJobs.delete(jobKey);
      });
      
      // Store the job reference
      scheduledJobs.set(jobKey, job);
      console.log(`Scheduled start for contest ${contest.id} at ${StartDate}`);
    }
  });
}

async function scheduleOngoingContests(io) {
  const contests = await prisma.Contest.findMany({
    where: {
      status: "Ongoing",
    },
    select: {
      endTime: true,
      id: true,
      name: true,
    },
  });
  console.log("Contests:", contests);
  
  contests.forEach((contest) => {
    const jobKey = createJobKey(contest.id, "end");
    
    // Cancel existing job if any
    cancelExistingJob(jobKey);
    
    const endTime = new Date(contest.endTime);
    console.log("End Time:", endTime);
    
    // Only schedule if the time is in the future
    if (endTime > new Date()) {
      const date = endTime.getDate();
      const month = endTime.getMonth(); // 0-11
      const year = endTime.getFullYear();
      const hour = endTime.getHours();
      const minute = endTime.getMinutes();
      const second = endTime.getSeconds();
      
      const EndDate = new Date(year, month, date, hour, minute, second);
      
      const job = schedule.scheduleJob(EndDate, async () => {
        console.log("Contest rating update phase started:", contest.name);
        // Update the contest status to "Ended"
        const updatedContest = await prisma.Contest.update({
          where: {
            id: contest.id,
          },
          data: {
            status: "Rating Update Pending",
          },
        });
        console.log("Contest updated:", updatedContest);
        // call the ranking update function
        submitContest(contest.id);
        io.emit("contestRatingPending", {
          contestId: contest.id,
          updatedContest,
        });
        
        // Remove from scheduled jobs map after execution
        scheduledJobs.delete(jobKey);
      });
      
      // Store the job reference
      scheduledJobs.set(jobKey, job);
      console.log(`Scheduled end for contest ${contest.id} at ${EndDate}`);
    }
  });
}

async function scheduleRatingPendingContests(io) {
  const contests = await prisma.Contest.findMany({
    where: {
      status: "Rating Update Pending",
    },
    select: {
      endTime: true,
      id: true,
      name: true,
    },
  });
  console.log("Contests:", contests);
  
  contests.forEach((contest) => {
    const jobKey = createJobKey(contest.id, "ratingUpdate");
    
    // Cancel existing job if any
    cancelExistingJob(jobKey);
    
    const endTime = new Date(contest.endTime);
    console.log("End Time:", endTime);
    
    const ratingUpdateTime = new Date(endTime.getTime() + 2 * 60 * 1000);
    
    // Only schedule if the time is in the future
    if (ratingUpdateTime > new Date()) {
      const job = schedule.scheduleJob(ratingUpdateTime, async () => {
        console.log("Contest Rating Update Phase Started:", contest.name);
        // Update the contest status to "Ended"
        const updatedContest = await prisma.Contest.update({
          where: {
            id: contest.id,
          },
          data: {
            status: "Ended",
          },
        });
        console.log("Contest updated:", updatedContest);
        io.emit("contestEnded", { contestId: contest.id, updatedContest });
        
        // Remove from scheduled jobs map after execution
        scheduledJobs.delete(jobKey);
      });
      
      // Store the job reference
      scheduledJobs.set(jobKey, job);
      console.log(`Scheduled rating update for contest ${contest.id} at ${ratingUpdateTime}`);
    }
  });
}

async function scheduler(io){
    cron.schedule("*/1 * * * *", async () => {
      console.log("Scheduling contests");
      // status -> upcoming, rank guess, ongoing, rating pending, ended
      await scheduleUpcomingContests(io);
      await scheduleRankGuessContests(io);
      await scheduleOngoingContests(io);
      await scheduleRatingPendingContests(io);
      console.log("Contests scheduled");
    });
}

module.exports = {
  scheduleUpcomingContests,
  scheduleRankGuessContests,
  scheduleOngoingContests,
  scheduleRatingPendingContests,
  scheduler,
  scheduledJobs // Export for debugging/monitoring
};