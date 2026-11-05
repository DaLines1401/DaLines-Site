import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Translations } from '../types';
import { sfx } from '../utils/sfx';

interface VideoBackgroundProps {
  isMuted: boolean;
  isAutoPlaying: boolean;
  setIsAutoPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  translations: Translations;
}

export const VideoBackground: React.FC<VideoBackgroundProps> = ({
  isMuted,
  isAutoPlaying,
  setIsAutoPlaying,
  translations,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const prevX = useRef<number | null>(null);
  const touchPrevX = useRef<number | null>(null);
  const isSeeking = useRef<boolean>(false);
  const pendingTargetTime = useRef<number | null>(null);
  const targetTimeRef = useRef<number>(0);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(1);
  const [isVideoLoaded, setIsVideoLoaded] = useState<boolean>(false);

  // SENSITIVITY from spec: 0.85
  const SENSITIVITY = 0.85;

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

      // On touch / small screens: initial gentle auto-play fallback
      if (window.innerWidth < 768) {
        setIsAutoPlaying(true);
      }
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
      video.play().catch(() => {
        // Browser autoplay restrictions may require user interaction
      });
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

  // Mouse move scrubber listener on window
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const video = videoRef.current;
      if (!video || !video.duration) return;

      if (prevX.current === null) {
        prevX.current = e.clientX;
        return;
      }

      const delta = e.clientX - prevX.current;
      prevX.current = e.clientX;

      // When user starts dragging cursor, pause auto-dance and scrub
      if (Math.abs(delta) > 1 && isAutoPlaying) {
        setIsAutoPlaying(false);
      }

      const dur = video.duration || 1;
      const timeOffset = (delta / window.innerWidth) * SENSITIVITY * dur;
      const nextTime = targetTimeRef.current + timeOffset;

      // Wrap-around loop or strict clamp:
      // Spec: Clamp targetTime strictly between 0 and video.duration
      const clamped = Math.max(0, Math.min(nextTime, dur));
      requestSeek(clamped);
    };

    const handleMouseLeave = () => {
      prevX.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isAutoPlaying, requestSeek, setIsAutoPlaying]);

  // Touch swipe scrubber listener on window
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchPrevX.current = e.touches[0].clientX;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const video = videoRef.current;
      if (!video || !video.duration || e.touches.length === 0) return;

      const currentX = e.touches[0].clientX;
      if (touchPrevX.current === null) {
        touchPrevX.current = currentX;
        return;
      }

      const delta = currentX - touchPrevX.current;
      touchPrevX.current = currentX;

      if (Math.abs(delta) > 2 && isAutoPlaying) {
        setIsAutoPlaying(false);
      }

      const dur = video.duration || 1;
      const timeOffset = (delta / window.innerWidth) * SENSITIVITY * dur;
      const nextTime = targetTimeRef.current + timeOffset;
      const clamped = Math.max(0, Math.min(nextTime, dur));
      requestSeek(clamped);
    };

    const handleTouchEnd = () => {
      touchPrevX.current = null;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isAutoPlaying, requestSeek, setIsAutoPlaying]);

  // Keyboard shortcut: Spacebar to toggle Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is in an input or textarea
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

  const scrubProgressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

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
          opacity: isVideoLoaded ? 1 : 0,
        }}
      />

      {/* Subtle Dark Vignette & Gradient Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-t from-black/85 via-black/35 to-black/60" />

      {/* Interactive Bottom Scrub HUD */}
      <aside 
        aria-label="Video scrubber HUD"
        className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-xl px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-between gap-3 text-xs sm:text-sm text-neutral-300 shadow-2xl transition-all"
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
            <>
              <span>▶ {translations.autoPlayPaused.split('(')[0]}</span>
            </>
          )}
        </button>

        {/* Scrub Progress Bar */}
        <div className="flex-1 flex flex-col justify-center gap-1">
          <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-[width] duration-75"
              style={{ width: `${scrubProgressPercent}%` }}
            />
          </div>
          <p className="text-[10px] sm:text-[11px] text-neutral-400 truncate text-center hidden sm:block">
            {translations.scrubHint}
          </p>
        </div>

        {/* Time Stamp */}
        <span className="text-[11px] font-mono text-neutral-400 shrink-0">
          {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
        </span>
      </aside>
    </>
  );
};
