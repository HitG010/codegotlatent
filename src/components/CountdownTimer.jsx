import { Hourglass } from "lucide-react";
import { useState, useEffect } from "react";

const CountdownTimer = ({ startTime, isOngoing }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(startTime));

  function calculateTimeLeft(startTime) {
    const contestStart = new Date(startTime).getTime();
    const now = Date.now();
    const difference = contestStart - now;

    if (difference <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((difference / (1000 * 60)) % 60);
    const seconds = Math.floor((difference / 1000) % 60);

    return { days, hours, minutes, seconds };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(startTime));
    }, 1000);

    return () => clearInterval(timer); // Cleanup on unmount
  }, [startTime]);

  return (
    <div className="text-lg font-semibold text-[#ffffff] bg-[#ffffff10] px-3 py-1 rounded-md flex gap-2 justify-center items-center">
      <Hourglass className="h-4 w-4" />
      {timeLeft.days > 0 && (
        <>
          {timeLeft.days}d{" "}
        </>
      )}
      {timeLeft.hours}h{" "}
      {timeLeft.minutes}m {timeLeft.seconds}s
    </div>
  );
};

export default CountdownTimer;
