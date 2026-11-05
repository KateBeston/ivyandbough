"use client";

import { useEffect, useState } from "react";

const DAY = 86400000;

// Counts down to midnight on Christmas morning in Brisbane, wherever the visitor is.
function remaining(now: number) {
  const year = new Date(now + 36000000).getUTCFullYear();
  const start = Date.UTC(year, 11, 24, 14);
  if (now >= start && now < start + DAY) return null;
  const left = (now < start ? start : Date.UTC(year + 1, 11, 24, 14)) - now;
  return { days: Math.floor(left / DAY), hours: Math.floor(left / 3600000) % 24, mins: Math.floor(left / 60000) % 60, secs: Math.floor(left / 1000) % 60 };
}

const two = (n: number) => String(n).padStart(2, "0");

export function Countdown() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  if (now === null) return <div className="eyebrow">&nbsp;</div>;
  const left = remaining(now);
  if (!left) return <div className="eyebrow">Merry Christmas</div>;
  return (
    <div className="eyebrow countdown" role="timer" aria-label={`${left.days} days until Christmas`}>
      <span>{left.days} days</span> <span>{two(left.hours)} hrs</span> <span>{two(left.mins)} mins</span> <span>{two(left.secs)} secs</span> <span className="countdown-end">until Christmas</span>
    </div>
  );
}
