import { useState, useEffect } from 'react';
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

  return (
    <div className="relative w-full min-h-screen bg-[#0a0a0c] text-white selection:bg-emerald-400 selection:text-black">
      {/* Navbar (fixed, z-20) */}
      <Navbar
        currentLang={currentLang}
        onToggleLang={handleToggleLang}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        translations={translations}
      />

      {/* Hero Section (z-10) */}
      <HeroSection translations={translations} />

      {/* Video Background & Mouse/Touch Scrubbing Engine (z-0) */}
      <VideoBackground
        isMuted={isMuted}
        isAutoPlaying={isAutoPlaying}
        setIsAutoPlaying={setIsAutoPlaying}
        translations={translations}
      />
    </div>
  );
}

export default App;
