import { useEffect, useState } from "react";
import { formatCountdown } from "../../lib/countdown";

export function CountdownTimer({ target, className }: { target: string; className?: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <span className={className} role="timer">{formatCountdown(new Date(target), now)}</span>;
}
