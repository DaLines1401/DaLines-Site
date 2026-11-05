import React, { useState } from 'react';
import { Translations } from '../types';
import { useTypewriter } from '../hooks/useTypewriter';
import { sfx } from '../utils/sfx';

interface HeroSectionProps {
  translations: Translations;
  scrollProgress: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ translations, scrollProgress }) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedCrosshair, setCopiedCrosshair] = useState(false);

  // Typewriter hook for Stage 1
  const { displayed, done } = useTypewriter(translations.typewriterText, {
    speed: 35,
    startDelay: 500,
  });

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('taung@windowslive.com');
      sfx.playSuccess();
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyCrosshair = async () => {
    try {
      await navigator.clipboard.writeText('0;P;c;5;o;1;d;1;z;1;f;0;0t;1;0l;2;0o;2;0a;1;0f;0;1b;0');
      sfx.playSuccess();
      setCopiedCrosshair(true);
      setTimeout(() => setCopiedCrosshair(false), 2000);
    } catch {
      // Fallback
    }
  };

  // 3D Tilt calculation for Bento cards
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  };

  // Calculate Opacity & Transforms for 3 Stages
  // Stage 1 (0 to 0.33)
  let op1 = 1;
  if (scrollProgress > 0.15) {
    op1 = Math.max(0, 1 - (scrollProgress - 0.15) / 0.15);
  }

  // Stage 2 (0.33 to 0.66)
  let op2 = 0;
  if (scrollProgress >= 0.20 && scrollProgress <= 0.40) {
    op2 = (scrollProgress - 0.20) / 0.20;
  } else if (scrollProgress > 0.40 && scrollProgress < 0.60) {
    op2 = 1;
  } else if (scrollProgress >= 0.60 && scrollProgress <= 0.75) {
    op2 = Math.max(0, 1 - (scrollProgress - 0.60) / 0.15);
  }

  // Stage 3 (0.66 to 1.0)
  let op3 = 0;
  if (scrollProgress >= 0.65) {
    op3 = Math.min(1, (scrollProgress - 0.65) / 0.18);
  }

  return (
    <section className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-8 my-auto flex items-center justify-center min-h-[460px]">
      
      {/* ================= STAGE 1: INTRO & TYPEWRITER ================= */}
      <div
        className="w-full max-w-2xl transition-all duration-300 ease-out flex flex-col justify-center"
        style={{
          opacity: op1,
          transform: `scale(${0.95 + 0.05 * op1}) translateY(${(1 - op1) * -20}px)`,
          pointerEvents: op1 > 0.5 ? 'auto' : 'none',
        }}
      >
        {/* Blurred Intro Label */}
        <div
          className="pointer-events-none select-none mb-3 font-normal text-neutral-200"
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

        {/* Typewriter Text */}
        <p
          className="text-white mb-6 font-normal min-h-[56px]"
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

        {/* Stage 1 Scroll Indicator */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-400 font-mono tracking-wider animate-pulse select-none">
          <span>↓</span>
          <span>{translations.stage1Scroll}</span>
        </div>
      </div>

      {/* ================= STAGE 2: 3D BENTO GRID ================= */}
      <div
        className="absolute inset-0 w-full flex items-center justify-center transition-all duration-300 ease-out"
        style={{
          opacity: op2,
          transform: `scale(${0.92 + 0.08 * op2})`,
          pointerEvents: op2 > 0.5 ? 'auto' : 'none',
        }}
      >
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 p-2 sm:p-4">
          
          {/* Bento Card 1: Valorant Rank */}
          <div
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            className="group relative p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-purple-500/50 backdrop-blur-xl shadow-2xl transition-transform duration-200"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="relative z-10 flex flex-col justify-between h-full space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/30">
                  {translations.bentoRankBadge}
                </span>
                <span className="text-xs text-neutral-400 font-mono">APAC</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-900/40 border border-purple-500/40 flex items-center justify-center text-purple-300 text-xl shadow-lg">
                  💎
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-extrabold text-white">Diamond 1 <span className="text-xs font-normal text-purple-300">(31 RR)</span></h4>
                  <p className="text-[11px] text-neutral-400">{translations.bentoRankPeak}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-white/10">
                <p className="text-[10px] text-neutral-400 font-mono uppercase mb-1.5">{translations.bentoAgentsLabel}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30">Sova (769h)</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Jett (399h)</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">Killjoy (308h)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bento Card 2: Battlestation Specs */}
          <div
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            className="group relative p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-emerald-500/50 backdrop-blur-xl shadow-2xl transition-transform duration-200"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="relative z-10 flex flex-col justify-between h-full space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30">
                  {translations.bentoSpecsBadge}
                </span>
                <span className="text-xs text-emerald-400 font-mono">⚡ 240Hz</span>
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-extrabold text-white mb-1">Ryzen 5 5600</h4>
                <p className="text-xs text-emerald-300 font-semibold mb-1">RTX 5060 Ti • 32GB RAM</p>
                <p className="text-[11px] text-neutral-300">ATK Ghost (800 DPI) • Loga Pad</p>
              </div>
              <div className="pt-2 border-t border-white/10">
                <a
                  href="../story/"
                  onMouseEnter={() => sfx.playHover()}
                  onClick={() => sfx.playClick()}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <span>{translations.bentoSpecsBtn}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Bento Card 3: Interactive Crosshair */}
          <div
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            className="group relative p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-cyan-500/50 backdrop-blur-xl shadow-2xl transition-transform duration-200"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="relative z-10 flex flex-col justify-between h-full space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30">
                  {translations.bentoCrosshairBadge}
                </span>
                <span className="text-xs text-cyan-400 font-mono">🎯 AIM</span>
              </div>
              <div className="flex items-center justify-center py-2">
                <div className="relative w-16 h-16 rounded-xl bg-black/60 border border-cyan-500/40 flex items-center justify-center shadow-inner">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                  <div className="absolute w-3 h-0.5 bg-cyan-400 left-2" />
                  <div className="absolute w-3 h-0.5 bg-cyan-400 right-2" />
                  <div className="absolute h-3 w-0.5 bg-cyan-400 top-2" />
                  <div className="absolute h-3 w-0.5 bg-cyan-400 bottom-2" />
                </div>
              </div>
              <div className="pt-2 border-t border-white/10">
                <button
                  onClick={handleCopyCrosshair}
                  onMouseEnter={() => sfx.playHover()}
                  className="w-full py-1.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-400 text-cyan-300 hover:text-black font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span>{copiedCrosshair ? 'Copied! ✓' : translations.bentoCrosshairBtn}</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ================= STAGE 3: ACTIONS & HUB CTA ================= */}
      <div
        className="absolute inset-0 w-full flex flex-col items-center justify-center transition-all duration-300 ease-out px-4 text-center"
        style={{
          opacity: op3,
          transform: `scale(${0.92 + 0.08 * op3}) translateY(${(1 - op3) * 20}px)`,
          pointerEvents: op3 > 0.5 ? 'auto' : 'none',
        }}
      >
        <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 font-heading tracking-wider">
          {translations.stage3Title}
        </h3>
        <p className="text-xs sm:text-sm text-neutral-400 mb-6 max-w-md">
          {translations.stage3Desc}
        </p>

        {/* Action Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 max-w-xl mb-6">
          <a
            href="https://www.twitch.tv/dalines"
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => sfx.playHover()}
            onClick={() => sfx.playClick()}
            className="inline-flex items-center justify-center bg-white text-black font-medium border border-white/20 rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-2 hover:bg-emerald-400 hover:text-black transition-all duration-200 cursor-pointer shadow-lg whitespace-nowrap active:scale-95"
          >
            {translations.pillTwitch}
          </a>

          <a
            href="https://www.youtube.com/@DaLinesTTV"
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => sfx.playHover()}
            onClick={() => sfx.playClick()}
            className="inline-flex items-center justify-center bg-white text-black font-medium border border-white/20 rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-2 hover:bg-emerald-400 hover:text-black transition-all duration-200 cursor-pointer shadow-lg whitespace-nowrap active:scale-95"
          >
            {translations.pillYoutube}
          </a>

          <a
            href="https://discord.gg/3m9x688YCG"
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => sfx.playHover()}
            onClick={() => sfx.playClick()}
            className="inline-flex items-center justify-center bg-white text-black font-medium border border-white/20 rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-2 hover:bg-emerald-400 hover:text-black transition-all duration-200 cursor-pointer shadow-lg whitespace-nowrap active:scale-95"
          >
            {translations.pillCommunity}
          </a>

          {/* Copy Email Button */}
          <button
            onClick={handleCopyEmail}
            onMouseEnter={() => sfx.playHover()}
            className="inline-flex items-center justify-center text-white bg-black/40 backdrop-blur-sm border border-white/40 rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-2 gap-2 hover:border-emerald-400 hover:text-emerald-300 transition-all cursor-pointer whitespace-nowrap shadow-lg active:scale-95"
          >
            {copiedEmail ? (
              <span className="text-emerald-400 font-semibold">{translations.pillCopied}</span>
            ) : (
              <span>
                {translations.pillEmailPrefix.split('taung@windowslive.com')[0]}
                <span className="underline underline-offset-2">taung@windowslive.com</span>
              </span>
            )}
          </button>
        </div>

        {/* Return to Hub */}
        <a
          href="../"
          onMouseEnter={() => sfx.playHover()}
          onClick={() => sfx.playClick()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/20 hover:bg-emerald-400 text-emerald-300 hover:text-black border border-emerald-500/40 font-bold text-xs sm:text-sm transition-all shadow-lg backdrop-blur-md cursor-pointer group"
        >
          <span>⚡ DaLines Battle Station Command Center ⚡</span>
        </a>
      </div>

    </section>
  );
};
