import { Hourglass } from "lucide-react";
import { useState, useEffect } from "react";

const CountdownTimer = ({ startTime, isOngoing }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(startTime));

  function calculateTimeLeft(startTime) {
    const contestStart = new Date(startTime).getTime();
    const now = new Date().getTime();
    const difference = contestStart - now;

    if (difference <= 0) return { hours: 0, minutes: 0, seconds: 0 };

    return {
      hours: Math.floor(difference / (1000 * 60 * 60)),
      minutes: Math.floor((difference / (1000 * 60)) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(startTime));
    }, 1000);

    return () => clearInterval(timer); // Cleanup on unmount
  }, [startTime]);

  return (
    <div className="text-lg font-semibold text-[#ffffff] bg-[#ffffff10] px-3 py-1 rounded-md flex gap-2 justify-center items-center">
      <Hourglass className="h-4 w-4"/> {timeLeft.hours}h{" "}
      {timeLeft.minutes}m {timeLeft.seconds}s
    </div>
  );
};

export default CountdownTimer;
