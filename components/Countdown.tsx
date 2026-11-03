"use client";

import { useEffect, useState } from "react";

function sleeps() {
  const now = new Date();
  let xmas = new Date(now.getFullYear(), 11, 25);
  if (now > xmas) xmas = new Date(now.getFullYear() + 1, 11, 25);
  return Math.ceil((xmas.getTime() - now.getTime()) / 86400000);
}

export function Countdown() {
  const [days, setDays] = useState<number | null>(null);
  useEffect(() => setDays(sleeps()), []);
  return <div className="eyebrow">{days === null ? " " : `${days} sleeps until Christmas`}</div>;
}
