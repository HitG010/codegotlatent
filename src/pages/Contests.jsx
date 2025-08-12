import React, { useState, useEffect } from "react";
import { fetchContests } from "../api/api";
import { parseDate, calculateDuration } from "../utils/date";
import { Link } from "react-router-dom";
import useUserStore from "../store/userStore";
import Navbar from "../components/Navbar";
import { ChevronRight, Loader2, MoveRight } from "lucide-react";
import { HiMiniTrophy } from "react-icons/hi2";
import cglContest from "../assets/cglContest.png";
import CountDownTimer from "../components/CountdownTimer";

export default function Contests() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useUserStore((state) => state.user);

  useEffect(() => {
    const fetchAllContests = async () => {
      try {
        const response = await fetchContests();
        setContests(response);
      } catch (error) {
        console.error("Error fetching contests:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllContests();
  }, []);

  const ongoingAndUpcoming = contests.filter((contest) => (contest.status === "Ongoing" || contest.status === "Upcoming" || contest.status === "Rank Guess Phase"));
  const past = contests.filter((contest) => (contest.status) == "Ended");

  const pathname = window.location.pathname;

  return (
    <div className="h-screen flex flex-col lg:flex-row justify-between bg-[#0F0F0F]">
      <Navbar path={pathname} />
      <div className="w-full lg:w-[80%] h-full flex flex-col gap-4 p-4 lg:pl-10 pt-6 lg:pt-16 pb-24 lg:pb-8 overflow-y-auto">
        <div className="flex flex-col mb-1">
          <h1 className="text-2xl lg:text-4xl font-semibold mb-0.2">Contests</h1>
          <h6 className="text-base lg:text-lg text-white/65 mb-4">Contest every week. Compete and showcase your "Latent"!</h6>
        </div>
        {loading ? (
          <div className="text-base lg:text-lg text-white/65 flex items-center gap-2"><Loader2 className="animate-spin" /> Loading...</div>
        ) : (
          <>
            <section>
              <h2 className="text-lg lg:text-xl font-semibold mb-2">Ongoing & Upcoming</h2>
              {ongoingAndUpcoming.length === 0 ? (
                <div className="text-white/65">No ongoing or upcoming contests.</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {ongoingAndUpcoming.map((contest) => (
                    <Link
                      key={contest.id}
                      to={`/contest/${contest.id}`}
                      className="flex flex-col justify-between px-3 lg:px-4 bg-[#181818] rounded-lg p-3 lg:p-4 hover:bg-[#232323] transition-all duration-300 w-full lg:w-fit"
                    >
                      <img src={cglContest} alt="Contest" className="w-full h-32 lg:h-50 object-cover rounded-lg mb-2" />
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-0">
                        <div className="flex flex-col items-start lg:items-center justify-center gap-0.2">
                          <div className="flex gap-3 items-center text-xl lg:text-2xl font-semibold">{contest.name}</div>
                          <p className="text-white/65 text-sm lg:text-md">
                            {parseDate(contest.rankGuessStartTime)}
                          </p>
                        </div>
                        <div className="flex flex-col items-start lg:items-center justify-center gap-0.2">
                          <div className="text-white/65 text-sm lg:text-md flex flex-col items-start lg:items-end justify-center gap-0.2">
                            {contest.status == "Ongoing" ? (
                              <><span>Ends in :</span> <CountDownTimer startTime={contest.endTime} /></>
                            ) : (
                              <><span>Starts in:</span> <CountDownTimer startTime={contest.rankGuessStartTime} /></>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
            <section>
              <h2 className="text-lg lg:text-xl font-semibold mt-6 lg:mt-8 mb-2">Past Contests</h2>
              {past.length === 0 ? (
                <div className="text-white/65">No past contests.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {past.map((contest) => (
                    <Link
                      key={contest.id}
                      to={`/contest/${contest.id}`}
                      className="flex flex-row justify-between items-center px-3 lg:px-4 bg-[#181818] rounded-lg p-3 lg:p-4 hover:bg-[#232323] transition gap-2"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex gap-3 items-center text-base lg:text-lg font-semibold">
                          <HiMiniTrophy className="w-5 h-5 lg:w-6 lg:h-6"/> 
                          {contest.name}
                        </div>
                        <p className="text-white/65 text-xs lg:text-sm">
                          {parseDate(contest.startTime)}
                        </p>
                      </div>
                      <div className="text-white/65 rounded-full bg-[#ffffff05] px-1 py-1 flex items-center gap-1 flex-shrink-0">
                        <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
