import React, { useState, useEffect } from 'react';
import { Translations } from '../types';
import { useTypewriter } from '../hooks/useTypewriter';
import { sfx } from '../utils/sfx';

interface HeroSectionProps {
  translations: Translations;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ translations }) => {
  const [copied, setCopied] = useState(false);
  const [pillsVisible, setPillsVisible] = useState(false);

  // Typewriter hook
  const { displayed, done } = useTypewriter(translations.typewriterText, {
    speed: 35,
    startDelay: 500,
  });

  // Action pills become visible 400ms after initial page load (independent of typewriter)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPillsVisible(true);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('taung@windowslive.com');
      sfx.playSuccess();
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      // Fallback
    }
  };

  const solidPills = [
    { label: translations.pillTwitch, href: 'https://www.twitch.tv/dalines', external: true },
    { label: translations.pillYoutube, href: 'https://www.youtube.com/@DaLinesTTV', external: true },
    { label: translations.pillSetup, href: '../#specs', external: false },
    { label: translations.pillCommunity, href: 'https://discord.gg/3m9x688YCG', external: true },
    { label: translations.pillStory, href: '../story/', external: false },
  ];

  return (
    <section className="relative z-10 w-full h-screen flex flex-col justify-end pb-24 sm:pb-28 md:justify-center md:pb-0 px-5 sm:px-8 md:px-12 overflow-hidden pointer-events-none">
      <div className="max-w-2xl relative z-10 pointer-events-auto">
        {/* 1. Blurred intro label */}
        <div
          className="pointer-events-none select-none mb-4 sm:mb-5 font-normal text-neutral-200"
          style={{
            fontSize: 'clamp(18px, 3.5vw, 24px)',
            lineHeight: 1.3,
            filter: 'blur(4px)',
          }}
        >
          {translations.introLine1}
          <br />
          {translations.introLine2}
        </div>

        {/* 2. Typewriter text */}
        <p
          className="text-white mb-6 font-normal min-h-[56px] text-shadow"
          style={{
            fontSize: 'clamp(18px, 4vw, 26px)',
            lineHeight: 1.4,
          }}
        >
          {displayed}
          {!done && (
            <span
              className="inline-block w-[2px] h-[1.1em] bg-emerald-400 align-middle ml-[3px] animate-blink"
              aria-hidden="true"
            />
          )}
        </p>

        {/* 3. Action pill buttons */}
        <div
          className={`flex flex-wrap items-center gap-2 sm:gap-2.5 transition-all duration-400 ease-out ${
            pillsVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          {/* Solid White/Emerald Pill Buttons */}
          {solidPills.map((pill) => (
            <a
              key={pill.label}
              href={pill.href}
              target={pill.external ? '_blank' : undefined}
              rel={pill.external ? 'noopener noreferrer' : undefined}
              onMouseEnter={() => sfx.playHover()}
              onClick={() => sfx.playClick()}
              className="inline-flex items-center justify-center bg-white text-black font-medium border border-white/20 rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-2 hover:bg-emerald-400 hover:text-black transition-all duration-200 cursor-pointer shadow-lg whitespace-nowrap active:scale-95"
            >
              {pill.label}
            </a>
          ))}

          {/* Outline Pill Button (Email with Clipboard Feedback) */}
          <button
            onClick={handleCopyEmail}
            onMouseEnter={() => sfx.playHover()}
            className="inline-flex items-center justify-center text-white bg-black/40 backdrop-blur-sm border border-white/40 rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-2 gap-2 hover:border-emerald-400 hover:text-emerald-300 transition-all cursor-pointer whitespace-nowrap shadow-lg active:scale-95"
            title="Click to copy business email"
          >
            {copied ? (
              <span className="text-emerald-400 font-semibold">{translations.pillCopied}</span>
            ) : (
              <>
                <span>
                  {translations.pillEmailPrefix.split('taung@windowslive.com')[0]}
                  <span className="underline underline-offset-2">taung@windowslive.com</span>
                </span>
                {/* 14x14 Copy Icon SVG */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 opacity-80"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};
