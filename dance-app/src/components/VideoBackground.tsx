import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Translations } from '../types';
import { sfx } from '../utils/sfx';

interface VideoBackgroundProps {
  isMuted: boolean;
  isAutoPlaying: boolean;
  setIsAutoPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  translations: Translations;
  scrollProgress: number;
}

export const VideoBackground: React.FC<VideoBackgroundProps> = ({
  isMuted,
  isAutoPlaying,
  setIsAutoPlaying,
  translations,
  scrollProgress,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isSeeking = useRef<boolean>(false);
  const pendingTargetTime = useRef<number | null>(null);
  const targetTimeRef = useRef<number>(0);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(1);
  const [isVideoLoaded, setIsVideoLoaded] = useState<boolean>(false);

  // Perform seek safely using onSeeked queue
  const requestSeek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video || isNaN(time) || !isFinite(time)) return;

    const clampedTime = Math.max(0, Math.min(time, video.duration || 1));
    targetTimeRef.current = clampedTime;

    if (isSeeking.current) {
      pendingTargetTime.current = clampedTime;
    } else {
      isSeeking.current = true;
      try {
        video.currentTime = clampedTime;
        setCurrentTime(clampedTime);
      } catch {
        isSeeking.current = false;
      }
    }
  }, []);

  const handleSeeked = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      isSeeking.current = false;
      return;
    }
    if (pendingTargetTime.current !== null) {
      const nextTime = pendingTargetTime.current;
      pendingTargetTime.current = null;
      try {
        video.currentTime = nextTime;
        setCurrentTime(nextTime);
      } catch {
        isSeeking.current = false;
      }
    } else {
      isSeeking.current = false;
    }
  }, []);

  // Handle Video Metadata Loaded
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      const dur = video.duration || 1;
      setDuration(dur);
      setIsVideoLoaded(true);
    }
  };

  // Sync isMuted state with video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Sync isAutoPlaying state with video playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isAutoPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isAutoPlaying]);

  // Track regular time update during auto-play
  const handleTimeUpdate = () => {
    if (videoRef.current && isAutoPlaying) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Scrub based on scrollProgress when not auto-playing
  useEffect(() => {
    if (!isAutoPlaying && videoRef.current && duration > 0) {
      const mappedTime = scrollProgress * duration;
      requestSeek(mappedTime);
    }
  }, [scrollProgress, isAutoPlaying, duration, requestSeek]);

  // Keyboard shortcut: Spacebar to toggle Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        sfx.playClick();
        setIsAutoPlaying((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsAutoPlaying]);

  // Active audio visualizer animation
  const [vizBars, setVizBars] = useState<number[]>([4, 6, 10, 5, 8, 4, 9, 6]);
  useEffect(() => {
    if (!isMuted && (isAutoPlaying || !videoRef.current?.paused)) {
      const interval = setInterval(() => {
        const now = Date.now() / 150;
        setVizBars(
          Array.from({ length: 8 }, (_, i) => 4 + Math.abs(Math.sin(now + i * 0.8)) * 12)
        );
      }, 50);
      return () => clearInterval(interval);
    } else {
      setVizBars([4, 4, 4, 4, 4, 4, 4, 4]);
    }
  }, [isMuted, isAutoPlaying]);

  const scrubProgressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const currentStageNum = scrollProgress >= 0.60 ? 3 : scrollProgress >= 0.25 ? 2 : 1;

  return (
    <>
      {/* Background Fullscreen Video */}
      <video
        ref={videoRef}
        src="../spookydance.mp4"
        muted={isMuted}
        playsInline
        preload="auto"
        loop
        onLoadedMetadata={handleLoadedMetadata}
        onSeeked={handleSeeked}
        onTimeUpdate={handleTimeUpdate}
        className="fixed inset-0 w-full h-full object-cover object-[70%_center] z-0 pointer-events-none transition-opacity duration-700"
        style={{
          opacity: isVideoLoaded ? 0.9 : 0,
        }}
      />

      {/* Subtle Dark Vignette & Gradient Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-t from-[#0a0a0c] via-black/40 to-black/80" />

      {/* Interactive Bottom HUD with Active Audio Visualizer */}
      <aside
        aria-label="Video scrubber HUD"
        className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-2xl px-4 py-2 rounded-full bg-black/70 backdrop-blur-xl border border-white/10 flex items-center justify-between gap-3 text-xs sm:text-sm text-neutral-300 shadow-2xl transition-all"
      >
        {/* Play/Pause Button */}
        <button
          onClick={() => {
            sfx.playClick();
            setIsAutoPlaying((prev) => !prev);
          }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-emerald-400 hover:text-black font-medium transition-colors text-white shrink-0 cursor-pointer"
          title="Press Space or click to toggle dance mode"
        >
          {isAutoPlaying ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>⏸ {translations.autoPlayActive.split('(')[0]}</span>
            </>
          ) : (
            <span>▶ {translations.autoPlayPaused.split('(')[0]}</span>
          )}
        </button>

        {/* 8-Bar Audio Visualizer Equalizer */}
        <div className={`flex items-center gap-1 h-4 px-2 transition-opacity ${!isMuted ? 'opacity-100' : 'opacity-40'}`}>
          {vizBars.map((height, idx) => (
            <span
              key={idx}
              className={`w-1 rounded-full transition-all ${idx < 4 ? 'bg-emerald-400' : 'bg-cyan-400'}`}
              style={{ height: `${height}px` }}
            />
          ))}
        </div>

        {/* Scrub Progress Bar & Stage Indicator */}
        <div className="flex-1 flex flex-col justify-center gap-1">
          <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-500 transition-[width] duration-75"
              style={{ width: `${scrubProgressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-neutral-400">
            <span className="font-mono text-emerald-400 font-semibold">STAGE {currentStageNum}/3</span>
            <span className="truncate hidden sm:inline">{translations.scrubHint}</span>
          </div>
        </div>

        {/* Time Stamp */}
        <span className="text-[11px] font-mono text-neutral-400 shrink-0">
          {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
        </span>
      </aside>
    </>
  );
};
