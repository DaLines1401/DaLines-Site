import React, { useState, useEffect } from 'react';
import { Language, Translations } from '../types';
import { sfx } from '../utils/sfx';

interface NavbarProps {
  currentLang: Language;
  onToggleLang: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  translations: Translations;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLang,
  onToggleLang,
  isMuted,
  onToggleMute,
  translations,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLive, setIsLive] = useState<boolean | null>(null);

  // Check Twitch live status
  useEffect(() => {
    let mounted = true;
    const checkLiveStatus = async () => {
      try {
        const res = await fetch('https://decapi.me/twitch/uptime/dalines');
        if (res.ok) {
          const text = await res.text();
          if (mounted) {
            // If offline, DecAPI returns "dalines is offline"
            const offline = text.toLowerCase().includes('offline');
            setIsLive(!offline);
          }
        }
      } catch {
        // Fallback gracefully
        if (mounted) setIsLive(false);
      }
    };

    checkLiveStatus();
    const interval = setInterval(checkLiveStatus, 120000); // 2 minutes
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const navLinks = [
    { label: translations.navHub, href: '../', external: false },
    { label: translations.navTwitch, href: 'https://www.twitch.tv/dalines', external: true },
    { label: translations.navYoutube, href: 'https://www.youtube.com/@DaLinesTTV', external: true },
    { label: translations.navTiktok, href: 'https://www.tiktok.com/@dalinestuang', external: true },
    { label: translations.navSetup, href: '../#specs', external: false },
    { label: translations.navDiscord, href: 'https://discord.gg/3m9x688YCG', external: true },
    { label: translations.navStory, href: '../story/', external: false },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-20 px-5 sm:px-8 py-4 sm:py-5 flex justify-between items-center bg-black/25 backdrop-blur-md border-b border-white/5 transition-all">
        {/* Left: Logo & Live spark */}
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="../"
            onClick={() => sfx.playClick()}
            onMouseEnter={() => sfx.playHover()}
            className="group flex items-center gap-2 sm:gap-3 no-underline cursor-pointer"
            title="Return to Main Hub"
          >
            <span className="text-[21px] sm:text-[26px] font-bold tracking-tight text-white font-[family-name:var(--font-heading)] group-hover:text-emerald-400 transition-colors">
              DaLines™
            </span>
            <span
              className="text-[22px] sm:text-[26px] text-emerald-400 select-none animate-pulse"
              style={{ letterSpacing: '-0.02em' }}
            >
              ✳︎
            </span>
          </a>

          {/* Twitch Live Status Badge */}
          {isLive !== null && (
            <a
              href="https://www.twitch.tv/dalines"
              target="_blank"
              rel="noopener noreferrer"
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                isLive
                  ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                  : 'bg-white/5 text-neutral-400 border-white/10'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-red-500' : 'bg-neutral-500'}`} />
              <span>{isLive ? translations.liveNow : translations.offline}</span>
            </a>
          )}
        </div>

        {/* Center: Desktop Nav Links (Hidden below md) */}
        <nav className="hidden md:flex items-center text-[18px] sm:text-[20px] text-neutral-200">
          {navLinks.map((link, idx) => (
            <React.Fragment key={link.label}>
              <a
                href={link.href}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
                onMouseEnter={() => sfx.playHover()}
                onClick={() => sfx.playClick()}
                className="hover:text-emerald-400 transition-colors duration-200 cursor-pointer select-none"
              >
                {link.label}
              </a>
              {idx < navLinks.length - 1 && (
                <span className="text-neutral-500 mx-1 select-none">, </span>
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* Right: Controls & CTA (Desktop) */}
        <div className="hidden md:flex items-center gap-4">
          {/* Language Toggle */}
          <button
            onClick={() => {
              sfx.playClick();
              onToggleLang();
            }}
            onMouseEnter={() => sfx.playHover()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white hover:bg-emerald-400 hover:text-black border border-white/10 transition-all cursor-pointer"
            title="Switch Language (TH / EN)"
          >
            <span>{currentLang === 'th' ? '🇹🇭 TH' : '🇬🇧 EN'}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              sfx.playClick();
              onToggleMute();
            }}
            onMouseEnter={() => sfx.playHover()}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              !isMuted
                ? 'bg-emerald-400 text-black border-emerald-400 shadow-md shadow-emerald-400/20'
                : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
            }`}
            title="Toggle Audio"
          >
            <span>{!isMuted ? '🔊' : '🔇'}</span>
            <span>{!isMuted ? translations.soundOn : translations.soundOff}</span>
          </button>

          {/* CTA: Watch Live */}
          <a
            href="https://www.twitch.tv/dalines"
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => sfx.playHover()}
            onClick={() => sfx.playClick()}
            className="text-[18px] sm:text-[20px] text-white underline underline-offset-4 hover:text-emerald-400 transition-colors ml-2 select-none"
          >
            {translations.ctaWatchLive}
          </a>
        </div>

        {/* Mobile: Controls + Hamburger */}
        <div className="flex items-center gap-3 md:hidden">
          {/* Quick Lang Toggle on Mobile */}
          <button
            onClick={() => {
              sfx.playClick();
              onToggleLang();
            }}
            className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-white border border-white/20"
          >
            {currentLang.toUpperCase()}
          </button>

          {/* Quick Sound Toggle on Mobile */}
          <button
            onClick={() => {
              sfx.playClick();
              onToggleMute();
            }}
            className="text-base px-1.5 py-0.5"
            title="Toggle Audio"
          >
            {!isMuted ? '🔊' : '🔇'}
          </button>

          {/* Hamburger Button */}
          <button
            onClick={() => {
              sfx.playClick();
              setMobileMenuOpen((prev) => !prev);
            }}
            aria-label="Toggle mobile navigation menu"
            className="w-8 h-8 flex flex-col justify-center items-center gap-[5px] focus:outline-none cursor-pointer z-30"
          >
            <span
              className={`w-6 h-[2px] bg-white transition-all duration-300 ease-in-out ${
                mobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''
              }`}
            />
            <span
              className={`w-6 h-[2px] bg-white transition-all duration-300 ease-in-out ${
                mobileMenuOpen ? 'opacity-0' : 'opacity-100'
              }`}
            />
            <span
              className={`w-6 h-[2px] bg-white transition-all duration-300 ease-in-out ${
                mobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''
              }`}
            />
          </button>
        </div>
      </header>

      {/* Mobile Overlay Menu (z-index: 15) */}
      <div
        className={`fixed inset-0 z-15 bg-black/95 backdrop-blur-lg flex flex-col justify-center px-8 gap-6 md:hidden transition-all duration-300 ${
          mobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col gap-5">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
              onClick={() => {
                sfx.playClick();
                setMobileMenuOpen(false);
              }}
              className="text-[28px] font-semibold text-white hover:text-emerald-400 transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a
            href="https://www.twitch.tv/dalines"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              sfx.playClick();
              setMobileMenuOpen(false);
            }}
            className="text-[28px] font-semibold text-emerald-400 underline underline-offset-4 mt-2"
          >
            {translations.ctaWatchLive}
          </a>
        </div>
      </div>
    </>
  );
};
