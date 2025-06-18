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


  const ongoingAndUpcoming = contests.filter((contest) => (contest.status === "Ongoing" || contest.status === "Upcoming"));
  const past = contests.filter((contest) => (contest.status) == "Ended");

  const pathname = window.location.pathname;

  return (
    <div className="h-screen flex flex-row justify-between bg-[#0F0F0F]">
      <Navbar path={pathname} />
      <div className="w-[80%] h-full flex flex-col gap-4 mx-12 py-8 overflow-y-auto">
        <div className="flex flex-col mb-1">
        <h1 className="text-4xl font-semibold mb-0.2">Contests</h1>
        <h6 className="text-lg text-white/65 mb-4">Contest every week. Compete and showcase your “Latent”!</h6>
        </div>
        {loading ? (
          <div className="text-lg text-white/65"><Loader2 className="animate-spin" /> Loading...</div>
        ) : (
          <>
            <section>
              <h2 className="text-xl font-semibold mb-2">Ongoing & Upcoming</h2>
              {ongoingAndUpcoming.length === 0 ? (
                <div className="text-white/65">No ongoing or upcoming contests.</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {ongoingAndUpcoming.map((contest) => (
                    <Link
                      key={contest.id}
                      to={`/contest/${contest.id}`}
                      className="flex flex-col justify-between px-4 bg-[#181818] rounded-lg p-4 hover:bg-[#232323] transition-all duration-300 w-fit"
                    >
                      {/* <div className="relative right-2 top-2">
                      {contest.status === "Ongoing" ? (
                        <div className="text-green-500 text-lg font-semibold mb-2">Ongoing</div>
                      ) : (
                        <div className="text-yellow-500 text-lg font-semibold mb-2">Upcoming</div>
                      )}
                      </div> */}
                      <img src={cglContest} alt="Contest" className="w-100 h-50 object-cover rounded-lg mb-2" />
                      <div className="flex flex-row items-center justify-between">
                        <div className="flex flex-col items-center justify-center gap-0.2">
                          <div className="flex gap-3 items-center text-2xl font-semibold">{contest.name}</div>
                          <p className="text-white/65 text-md">
                            {parseDate(contest.startTime)}
                          </p>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-0.2">
                          <div className="text-white/65 text-md flex flex-col items-end justify-center gap-0.2">
                            {contest.status == "Ongoing" ? (
                              <><span>Ends in :</span> <CountDownTimer startTime={contest.endTime} /></>
                            ) : (
                              <><span>Starts in:</span> <CountDownTimer startTime={contest.startTime} /></>
                            )}
                            {/* <Link to={`/contest/${contest.id}`} className="text-black px-3 py-1 flex items-center justify-center bg-white rounded-md gap-1 w-fit">Enter <MoveRight className="w-4 h-4"/></Link> */}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
            <section>
              <h2 className="text-xl font-semibold mt-8 mb-2">Past Contests</h2>
              {past.length === 0 ? (
                <div className="text-white/65">No past contests.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {past.map((contest) => (
                    <Link
                      key={contest.id}
                      to={`/contest/${contest.id}`}
                      className="flex flex-row justify-between items-center px-4 bg-[#181818] rounded-lg p-4 hover:bg-[#232323] transition"
                    >
                      <div className="flex gap-3 items-center text-lg font-semibold"><HiMiniTrophy className="w-6 h-6"/> {contest.name}</div>
                      {/* <p className="text-white/65">{contest.description}</p> */}
                      <div className="flex flex-row items-center justify-center gap-2">
                        <p className="text-white/65 text-sm">
                          {parseDate(contest.startTime)}
                        </p>
                        <p className="text-white/65 rounded-full bg-[#ffffff05] px-1 py-1 flex items-center gap-1">
                          {/* Duration: {calculateDuration(contest.startTime, contest.endTime)} */}
                          <ChevronRight className="w-5 h-5" />
                        </p>
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
