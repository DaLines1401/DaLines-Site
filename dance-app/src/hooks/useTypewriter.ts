import { useState, useEffect } from 'react';

interface UseTypewriterOptions {
  speed?: number;
  startDelay?: number;
}

export function useTypewriter(
  text: string,
  options: UseTypewriterOptions = {}
): { displayed: string; done: boolean } {
  const { speed = 35, startDelay = 500 } = options;
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);

    let currentIndex = 0;
    let timer: NodeJS.Timeout | null = null;
    let interval: NodeJS.Timeout | null = null;

    timer = setTimeout(() => {
      interval = setInterval(() => {
        currentIndex += 1;
        if (currentIndex <= text.length) {
          setDisplayed(text.slice(0, currentIndex));
        }
        if (currentIndex >= text.length) {
          if (interval) clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, startDelay);

    return () => {
      if (timer) clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  }, [text, speed, startDelay]);

  return { displayed, done };
}
