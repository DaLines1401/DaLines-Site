import { useState, useEffect, useRef } from 'react';
import { Language, DICTIONARY } from './types';
import { Navbar } from './components/Navbar';
import { VideoBackground } from './components/VideoBackground';
import { HeroSection } from './components/HeroSection';

export function App() {
  const [currentLang, setCurrentLang] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dalines_lang');
      if (saved === 'en' || saved === 'th') return saved;
    }
    return 'th';
  });

  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const targetProgress = useRef<number>(0);
  const currentProgress = useRef<number>(0);

  // Sync lang changes to localStorage
  const handleToggleLang = () => {
    setCurrentLang((prev) => {
      const next: Language = prev === 'th' ? 'en' : 'th';
      localStorage.setItem('dalines_lang', next);
      return next;
    });
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const translations = DICTIONARY[currentLang];

  // Set document language attribute
  useEffect(() => {
    document.documentElement.lang = currentLang;
  }, [currentLang]);

  // Smooth Lerp scroll track calculation
  useEffect(() => {
    const handleScroll = () => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const trackHeight = trackRef.current.offsetHeight - window.innerHeight;
      if (trackHeight <= 0) return;
      const scrolled = -rect.top;
      targetProgress.current = Math.max(0, Math.min(1, scrolled / trackHeight));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();

    let animationFrameId: number;
    const loop = () => {
      currentProgress.current += (targetProgress.current - currentProgress.current) * 0.12;
      setScrollProgress(currentProgress.current);
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full bg-[#0a0a0c] text-white selection:bg-emerald-400 selection:text-black">
      {/* 300vh Scroll Track */}
      <div ref={trackRef} className="relative w-full" style={{ height: '300vh' }}>
        {/* Sticky 100vh Viewport */}
        <div className="sticky top-0 w-full h-screen overflow-hidden flex flex-col justify-between">
          {/* Navbar (fixed, z-20) */}
          <Navbar
            currentLang={currentLang}
            onToggleLang={handleToggleLang}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            translations={translations}
          />

          {/* 3 Cinematic Stages Hero Section (z-10) */}
          <HeroSection translations={translations} scrollProgress={scrollProgress} />

          {/* Video Background & Scrubbing Engine (z-0) */}
          <VideoBackground
            isMuted={isMuted}
            isAutoPlaying={isAutoPlaying}
            setIsAutoPlaying={setIsAutoPlaying}
            translations={translations}
            scrollProgress={scrollProgress}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
