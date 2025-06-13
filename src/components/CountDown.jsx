import React, { useState, useEffect } from "react";

function Countdown({ targetTime }) {
  const parseTarget = () =>
    targetTime instanceof Date ? targetTime : new Date(targetTime);
  const [timeLeftMs, setTimeLeftMs] = useState(() => {
    const diff = parseTarget() - new Date();
    return diff > 0 ? diff : 0;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = parseTarget() - new Date();
      setTimeLeftMs(diff > 0 ? diff : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime]);

  const getParts = (ms) => {
    let remaining = ms;
    const secsTotal = Math.floor(remaining / 1000);
    const days = Math.floor(secsTotal / (24 * 3600));
    const hours = Math.floor((secsTotal % (24 * 3600)) / 3600);
    const minutes = Math.floor((secsTotal % 3600) / 60);
    const seconds = secsTotal % 60;
    return { days, hours, minutes, seconds };
  };

  const { days, hours, minutes, seconds } = getParts(timeLeftMs);

  // Format as "Xd Yh Zm Ws"
  const padded = (num) => String(num).padStart(1, ""); // no zero-pad needed, but you can pad like padStart(2, "0") if desired
  return (
    <span className="font-mono">
      {padded(days)}d {padded(hours)}h {padded(minutes)}m {padded(seconds)}s
    </span>
  );
}

export default Countdown;
