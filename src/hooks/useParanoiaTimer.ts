import { useState, useEffect, useRef } from 'react';

interface UseParanoiaTimerProps {
  duration: number;
  isActive: boolean;
  onTimeUp: () => void;
}

export const useParanoiaTimer = ({
  duration,
  isActive,
  onTimeUp,
}: UseParanoiaTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const start = () => {
    if (intervalRef.current) return;

    setTimeLeft(duration);
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimeLeft(duration);
  };

  const reset = () => {
    stop();
    if (isActive) {
      start();
    }
  };

  useEffect(() => {
    if (isActive) {
      start();
    } else {
      stop();
    }

    return () => stop();
  }, [isActive]);

  useEffect(() => {
    return () => stop();
  }, []);

  return {
    timeLeft,
    start,
    stop,
    reset,
    isRunning: intervalRef.current !== null,
  };
};
