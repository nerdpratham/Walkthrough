'use client';

import { useState, useCallback } from 'react';

interface ControlBarProps {
  canGoBack: boolean;
  onBack: () => void;
}

export function ControlBar({ canGoBack, onBack }: ControlBarProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  return (
    <div className="absolute bottom-6 right-4 z-40 flex items-center gap-2">
      <button
        onClick={onBack}
        disabled={!canGoBack}
        title="Previous scene"
        className="flex h-9 w-9 items-center justify-center rounded-lg
          bg-black/60 backdrop-blur-sm ring-1 ring-white/10 text-white/70
          transition hover:bg-black/80 hover:text-white
          disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="relative">
        <button
          onClick={() => setShowHelp((h) => !h)}
          title="Help"
          className="flex h-9 w-9 items-center justify-center rounded-lg
            bg-black/60 backdrop-blur-sm ring-1 ring-white/10 text-white/70
            transition hover:bg-black/80 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3
                 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093
                 M12 17h.01" />
          </svg>
        </button>
        {showHelp && (
          <div className="absolute bottom-11 right-0 w-52 rounded-lg
            bg-black/80 px-3 py-2 text-xs text-white/70 backdrop-blur-sm
            ring-1 ring-white/10 shadow-xl">
            Click floor markers to move through the tour.
          </div>
        )}
      </div>

      <button
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        className="flex h-9 w-9 items-center justify-center rounded-lg
          bg-black/60 backdrop-blur-sm ring-1 ring-white/10 text-white/70
          transition hover:bg-black/80 hover:text-white"
      >
        {isFullscreen ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9h4.5M15 9V4.5
                 M15 9l5.25-5.25M9 15H4.5M9 15v4.5M9 15l-5.25 5.25
                 M15 15h4.5M15 15v4.5M15 15l5.25 5.25" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5
                 m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5
                 m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
        )}
      </button>
    </div>
  );
}
